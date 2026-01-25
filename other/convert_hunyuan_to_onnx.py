#!/usr/bin/env python3
"""
Script to convert HunyuanVideo components to ONNX.
Adapted to use external data saving for large models updates.
"""

import os
# Disable HF_HUB_ENABLE_HF_TRANSFER immediately to prevent import-time checks from enabling it
os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "0"

import argparse
import logging
import time
import tempfile
import shutil
import numpy as np
import torch
from diffusers import AutoencoderKLHunyuanVideo, HunyuanVideoTransformer3DModel
from transformers import LlamaModel
from huggingface_hub import snapshot_download
from contextlib import contextmanager

import threading
import gc

# Helper for progress logging
class ProgressLogger(threading.Thread):
    def __init__(self, message="Processing...", interval=10):
        super().__init__()
        self.message = message
        self.interval = interval
        self.stop_event = threading.Event()
        self.start_time = time.time()
        self.daemon = True

    def run(self):
        while not self.stop_event.wait(self.interval):
            elapsed = time.time() - self.start_time
            logger.info(f"{self.message} [Elapsed: {elapsed:.0f}s]")

    def stop(self):
        self.stop_event.set()

@contextmanager
def show_progress(message="Processing", interval=10):
    p = ProgressLogger(message=message, interval=interval)
    p.start()
    try:
        yield
    finally:
        p.stop()
# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def import_onnx():
    try:
        import onnx
        return onnx
    except ImportError as e:
        logger.error(f"Failed to import onnx: {e}")
        return None

def import_ort():
    try:
        import onnxruntime as ort
        return ort
    except ImportError as e:
        logger.warning(f"Failed to import onnxruntime: {e}. Validation will be skipped.")
        return None

def import_tensorrt():
    try:
        import tensorrt as trt
        return trt
    except ImportError as e:
        logger.warning(f"Failed to import tensorrt: {e}. TensorRT export will be skipped.")
        return None

# Context manager for ONNX export handling external data
@contextmanager
def onnx_export_manager():
    import onnx
    from tempfile import TemporaryDirectory
    original_export = torch.onnx.export

    def export_wrapper(model, args, f, **kwargs):
        # Create a temporary directory to hold the initial export
        with TemporaryDirectory() as d:
            temp_onnx_file = os.path.join(d, os.path.basename(f))
            
            logger.info(f"Exporting to temporary file: {temp_onnx_file}")
            # Call original export
            with show_progress(f"Exporting (tracing) to {os.path.basename(temp_onnx_file)}"):
                original_export(model, args, temp_onnx_file, **kwargs)
            
            logger.info("Loading ONNX model to save with external data...")
            with show_progress("Loading temporary ONNX model"):
                onnx_model = onnx.load(temp_onnx_file)
            
            logger.info(f"Saving final ONNX model with external data to: {f}")
            # Save with external data
            with show_progress(f"Saving with external data to {os.path.basename(f)}"):
                onnx.save(
                    onnx_model,
                    f,
                    save_as_external_data=True,
                    all_tensors_to_one_file=True,
                    location=os.path.basename(f) + '.data',
                    convert_attribute=True
                )

    # Patch torch.onnx.export
    torch.onnx.export = export_wrapper
    try:
        yield
    finally:
        # Restore original export
        torch.onnx.export = original_export

def get_args():
    parser = argparse.ArgumentParser(description="Export HunyuanVideo to ONNX")
    parser.add_argument("--model_id", type=str, default="hunyuanvideo-community/HunyuanVideo", help="Hugging Face model ID")
    parser.add_argument("--output_dir", type=str, default="./onnx_models", help="Directory to save ONNX models")
    parser.add_argument("--opset", type=int, default=17, help="ONNX opset version")
    parser.add_argument("--fp16", action="store_true", help="Export in FP16 (experimental)")
    parser.add_argument("--device", type=str, default="cuda", help="Device to use for export")
    parser.add_argument("--validate", action="store_true", help="Validate ONNX model after export")
    parser.add_argument("--component", type=str, default="all", choices=["all", "vae", "transformer", "text_encoder"], help="Component to export")
    parser.add_argument("--export_tensorrt", action="store_true", help="Build TensorRT engine after ONNX export")
    parser.add_argument("--trt_workspace", type=float, default=4.0, help="TensorRT workspace size in GB")
    parser.add_argument("--trt_fp16", action="store_true", help="Enable TensorRT FP16 mode")
    parser.add_argument("--trt_log_level", type=str, default="info", choices=["verbose", "info", "warning", "error"], help="TensorRT logging level")
    return parser.parse_args()

def get_trt_profile(component, batch_size=1):
    """
    Define Min/Opt/Max profiles for TensorRT optimization.
    Adjust these shapes to fit the target GPU (e.g., RTX 2080).
    """
    if component == "vae":
        # Shapes: batch, channels, frames, height, width
        # Latents: channels=16
        min_shape = (1, 16, 1, 16, 16)
        opt_shape = (batch_size, 16, 33, 64, 64)   # ~4 seconds video at 720p latents? Adjust as needed
        max_shape = (batch_size, 16, 129, 128, 128) # Allow up to longer videos/higher res
        return {"latents": (min_shape, opt_shape, max_shape)}
        
    elif component == "transformer":
        # hidden_states: batch, 16, frames, height, width
        # encoder_hidden_states: batch, seq_len, 4096
        # etc...
        min_frames, opt_frames, max_frames = 1, 33, 129
        min_h, opt_h, max_h = 16, 64, 128
        min_w, opt_w, max_w = 16, 64, 128
        
        min_seq, opt_seq, max_seq = 1, 128, 256 # Text encoder seq len
        
        profiles = {}
        profiles["hidden_states"] = (
            (1, 16, min_frames, min_h, min_w),
            (batch_size, 16, opt_frames, opt_h, opt_w),
            (batch_size, 16, max_frames, max_h, max_w)
        )
        profiles["encoder_hidden_states"] = (
            (1, min_seq, 4096),
            (batch_size, opt_seq, 4096),
            (batch_size, max_seq, 4096)
        )
        profiles["encoder_attention_mask"] = (
            (1, min_seq),
            (batch_size, opt_seq),
            (batch_size, max_seq)
        )
        return profiles

    elif component == "text_encoder":
        # input_ids: batch, seq_len
        min_seq, opt_seq, max_seq = 1, 128, 256
        profiles = {}
        profiles["input_ids"] = ((1, min_seq), (batch_size, opt_seq), (batch_size, max_seq))
        profiles["attention_mask"] = ((1, min_seq), (batch_size, opt_seq), (batch_size, max_seq))
        return profiles
    
    return {}

def build_tensorrt_engine(onnx_path, output_dir, component, size_gb=4.0, use_fp16=False, log_level="info"):
    trt = import_tensorrt()
    if trt is None:
        return

    engine_name = f"{component}.engine"
    engine_path = os.path.join(output_dir, engine_name)
    logger.info(f"Building TensorRT Engine: {engine_path}")
    logger.warning("NOTE: TensorRT engines are device-specific. If you build this on an RTX 5090, it will NOT work on an RTX 2080.")
    logger.warning("To run on RTX 2080, run this script ON the RTX 2080, or use the exported ONNX files to build the engine there.")

    TRT_LOGGER = trt.Logger(trt.Logger.INFO)
    if log_level == "verbose": TRT_LOGGER.min_severity = trt.Logger.VERBOSE
    elif log_level == "warning": TRT_LOGGER.min_severity = trt.Logger.WARNING
    elif log_level == "error": TRT_LOGGER.min_severity = trt.Logger.ERROR

    builder = trt.Builder(TRT_LOGGER)
    network = builder.create_network(1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH))
    parser = trt.OnnxParser(network, TRT_LOGGER)
    config = builder.create_builder_config()

    # Memory pool
    workspace_bytes = int(size_gb * (1 << 30))
    config.set_memory_pool_limit(trt.MemoryPoolType.WORKSPACE, workspace_bytes)
    
    if use_fp16 and builder.platform_has_fast_fp16:
        logger.info("Enabling FP16 support.")
        config.set_flag(trt.BuilderFlag.FP16)
    
    # Parse ONNX
    with open(onnx_path, 'rb') as model:
        if not parser.parse(model.read()):
            logger.error("Failed to parse ONNX file.")
            for error in range(parser.num_errors):
                logger.error(parser.get_error(error))
            return

    # Optimization Profiles
    profile = builder.create_optimization_profile()
    profile_shapes = get_trt_profile(component)
    
    for input_name, (min_s, opt_s, max_s) in profile_shapes.items():
        # Check if input exists in network
        found = False
        for i in range(network.num_inputs):
            if network.get_input(i).name == input_name:
                found = True
                break
        if found:
            logger.info(f"Setting profile for {input_name}: min={min_s}, opt={opt_s}, max={max_s}")
            profile.set_shape(input_name, min_s, opt_s, max_s)
    
    config.add_optimization_profile(profile)

    logger.info("Building engine (this may take a while)...")
    try:
        serialized_engine = builder.build_serialized_network(network, config)
        if serialized_engine is None:
            logger.error("Engine build failed!")
            return
            
        with open(engine_path, "wb") as f:
            f.write(serialized_engine)
        logger.info(f"Engine saved to {engine_path}")
        
    except Exception as e:
        logger.error(f"Error building engine: {e}")


def validate_onnx(onnx_path, torch_out, inputs):
    """
    Validate ONNX model by comparing output with PyTorch output.
    """
    ort = import_ort()
    if ort is None:
        return False

    logger.info(f"Validating ONNX model: {onnx_path}")
    sess_options = ort.SessionOptions()
    
    providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
    try:
        session = ort.InferenceSession(onnx_path, sess_options, providers=providers)
    except Exception as e:
        logger.warning(f"Failed to create InferenceSession with CUDA: {e}. Falling back to CPU.")
        session = ort.InferenceSession(onnx_path, sess_options, providers=['CPUExecutionProvider'])

    # Prepare inputs for ONNX
    ort_inputs = {k: v.cpu().numpy() for k, v in inputs.items()}
    
    # Run inference
    start_time = time.time()
    try:
        ort_outs = session.run(None, ort_inputs)
    except Exception as e:
        logger.error(f"Validation inference failed: {e}")
        return False
        
    logger.info(f"ONNX inference time: {time.time() - start_time:.4f}s")
    
    onnx_out = ort_outs[0]
    torch_out_np = torch_out.detach().cpu().numpy()
    
    if onnx_out.shape != torch_out_np.shape:
        logger.error(f"Shape mismatch! Torch: {torch_out_np.shape}, ONNX: {onnx_out.shape}")
        return False
        
    mse = np.mean((onnx_out - torch_out_np) ** 2)
    logger.info(f"Mean Squared Error: {mse}")
    
    threshold = 1e-2 if "float16" in str(torch_out.dtype) else 1e-3
    
    if mse < threshold:
        logger.info("Validation PASSED")
        return True
    else:
        logger.warning(f"Validation FAILED (MSE > {threshold})")
        return False



def safe_convert_fp16(onnx_path):
    """
    Safely convert an ONNX model to FP16 using onnxruntime.transformers.
    """
    try:
        from onnxruntime.transformers.float16 import convert_float_to_float16
        import onnx
        logger.info(f"Converting {onnx_path} to FP16 using ONNXRuntime...")
        model = onnx.load(onnx_path)
        # keep_io_types=False means inputs/outputs will be cast to fp16
        new_model = convert_float_to_float16(model, keep_io_types=False)
        onnx.save(new_model, onnx_path)
        logger.info("Conversion complete.")
    except ImportError:
        logger.warning("Could not import convert_float_to_float16 from onnxruntime.transformers. Skipping FP16 conversion.")
    except Exception as e:
        logger.warning(f"Failed to convert to FP16: {e}. Model remains in FP32.")

def export_vae(model_id, output_dir, opset, device, validate, dtype=torch.float32):
    logger.info("Exporting VAE Decoder...")
    onnx_path = os.path.join(output_dir, "vae_decoder.onnx")
    
    # Reverting to use the requested device (GPU) as per user request
    # export_device = "cpu"
    # export_dtype = torch.float32
    
    logger.info(f"Exporting VAE on {device} in {dtype}...")
    
    try:
        vae = AutoencoderKLHunyuanVideo.from_pretrained(model_id, subfolder="vae")
    except Exception as e:
        logger.error(f"Failed to load VAE: {e}")
        return

    vae.to(device, dtype=dtype)
    vae.eval()
    

    class VAEDecoderWrapper(torch.nn.Module):
        def __init__(self, vae):
            super().__init__()
            self.vae = vae
        def forward(self, latents):
            return self.vae.decode(latents, return_dict=False)[0]

    model = VAEDecoderWrapper(vae)
    model.to(device)
    # Ensure VAE is in eval mode
    model.eval()

    
    # Dummy Input
    batch = 1
    channels = 16
    frames = 5
    height = 64 # latents
    width = 64 
    
    latents = torch.randn(batch, channels, frames, height, width, device=device, dtype=dtype)
    
    inputs = {"latents": latents}
    
    # We do validation on the export device (CPU) for the torch output
    with torch.no_grad():
        torch_out = model(latents)
    
    dynamic_axes = {
        "latents": {0: "batch", 2: "frames", 3: "height", 4: "width"},
        "output": {0: "batch", 2: "frames", 3: "height", 4: "width"}
    }
    
    logger.info("Exporting to ONNX...")
    try:
        with onnx_export_manager():
            torch.onnx.export(
                model,
                (latents,),
                onnx_path,
                input_names=["latents"],
                output_names=["output"],
                dynamic_axes=dynamic_axes,
                opset_version=opset,
                do_constant_folding=True,
                dynamo=True
            )
        
        # Convert to FP16 if requested
        if target_fp16:
            safe_convert_fp16(onnx_path)
            
        if validate:
            validate_onnx(onnx_path, torch_out, inputs)
            
    except RuntimeError as e:
        if "device" in str(e).lower() and device != "cpu":
            logger.warning(f"Export on {device} failed due to device mismatch: {e}")
            logger.warning("Falling back to CPU export...")
            export_vae(model_id, output_dir, opset, "cpu", validate, dtype)
            return
        else:
             logger.error(f"Export failed: {e}")
    except Exception as e:
        logger.error(f"Export failed: {e}")


def export_transformer(model_id, output_dir, opset, device, validate, dtype=torch.float32):
    logger.info("Exporting Transformer...")
    onnx_path = os.path.join(output_dir, "transformer.onnx")
    
    try:
        transformer = HunyuanVideoTransformer3DModel.from_pretrained(
            model_id, subfolder="transformer", torch_dtype=dtype
        )
    except Exception as e:
        logger.error(f"Failed to load Transformer: {e}")
        return

    transformer.to(device)
    transformer.eval()
    
    # Inputs for Transformer
    batch = 1
    frames = 5
    height = 64
    width = 64
    in_channels = 16
    
    hidden_states = torch.randn(batch, in_channels, frames, height, width, device=device, dtype=dtype)
    timestep = torch.tensor([1.0], device=device, dtype=dtype)
    
    text_encoder_dim = transformer.config.joint_attention_dim # 4096
    sequence_length = 128
    encoder_hidden_states = torch.randn(batch, sequence_length, text_encoder_dim, device=device, dtype=dtype)
    encoder_attention_mask = torch.ones(batch, sequence_length, device=device, dtype=torch.int64)
    
    pooled_projection_dim = transformer.config.pooled_projection_dim 
    pooled_projections = torch.randn(batch, pooled_projection_dim, device=device, dtype=dtype)
    
    guidance = torch.tensor([1000.0], device=device, dtype=dtype)
    
    inputs_tuple = (hidden_states, timestep, encoder_hidden_states, encoder_attention_mask, pooled_projections, guidance)
    input_names = ["hidden_states", "timestep", "encoder_hidden_states", "encoder_attention_mask", "pooled_projections", "guidance"]
    output_names = ["sample"]
    
    inputs_dict = {
        "hidden_states": hidden_states,
        "timestep": timestep,
        "encoder_hidden_states": encoder_hidden_states,
        "encoder_attention_mask": encoder_attention_mask,
        "pooled_projections": pooled_projections, 
        "guidance": guidance
    }

    logger.info("Running Torch Inference...")
    with torch.no_grad():
        with show_progress("Running PyTorch Model for shapes"):
            torch_out = transformer(*inputs_tuple, return_dict=False)[0]

    dynamic_axes = {
        "hidden_states": {0: "batch", 2: "frames", 3: "height", 4: "width"},
        "encoder_hidden_states": {0: "batch", 1: "sequence_length"},
        "encoder_attention_mask": {0: "batch", 1: "sequence_length"},
        "sample": {0: "batch", 2: "frames", 3: "height", 4: "width"}
    }
    
    logger.info("Exporting Transformer to ONNX (this may take a while)...")
    
    try:
        with onnx_export_manager():
            torch.onnx.export(
                transformer,
                inputs_tuple,
                onnx_path,
                input_names=input_names,
                output_names=output_names,
                dynamic_axes=dynamic_axes,
                opset_version=opset,
                do_constant_folding=True,
                dynamo=True
            )
        
        if validate:
            validate_onnx(onnx_path, torch_out, inputs_dict)
            
    except Exception as e:
        logger.error(f"Export failed: {e}")

def export_text_encoder(model_id, output_dir, opset, device, validate, dtype=torch.float32):
    logger.info("Exporting Text Encoder (Llama)...")
    onnx_path = os.path.join(output_dir, "text_encoder.onnx")
    
    # Reverting to use the requested device (GPU)
    # export_device = "cpu"
    # export_dtype = torch.float32
    # target_fp16 = (dtype == torch.float16)

    # Temporary fix: Text Encoder uses internal buffers that might default to CPU?
    # Keeping it simple for now.

    
    logger.info(f"Exporting Text Encoder on {device} in {dtype}...")

    try:
        text_encoder = LlamaModel.from_pretrained(model_id, subfolder="text_encoder", torch_dtype=dtype)
    except Exception as e:
        logger.error(f"Failed to load Text Encoder: {e}")
        return

    text_encoder.to(device)
    text_encoder.eval()
    
    seq_len = 128
    input_ids = torch.randint(0, 1000, (1, seq_len), device=device, dtype=torch.int64)
    attention_mask = torch.ones((1, seq_len), device=device, dtype=torch.int64)
    
    inputs = (input_ids, attention_mask)
    input_names = ["input_ids", "attention_mask"]
    
    logger.info("Running Torch Inference...")
    with torch.no_grad():
        with show_progress("Running PyTorch Model for shapes"):
            out = text_encoder(input_ids, attention_mask=attention_mask)
            torch_out = out[0]
    
    inputs_dict = {"input_ids": input_ids, "attention_mask": attention_mask}
    
    dynamic_axes = {
        "input_ids": {0: "batch", 1: "sequence_length"},
        "attention_mask": {0: "batch", 1: "sequence_length"},
        "last_hidden_state": {0: "batch", 1: "sequence_length"}
    }
    
    logger.info("Exporting to ONNX...")
    try:
        with onnx_export_manager():
            torch.onnx.export(
                text_encoder,
                inputs,
                onnx_path,
                input_names=input_names,
                output_names=["last_hidden_state"],
                dynamic_axes=dynamic_axes,
                opset_version=opset,
                do_constant_folding=True,
                dynamo=True
            )
        
        # Convert to FP16 if requested
        if target_fp16:
            safe_convert_fp16(onnx_path)

        if validate:
            validate_onnx(onnx_path, torch_out, inputs_dict)
    except Exception as e:
        logger.error(f"Export failed: {e}")



def download_model(model_id):
    """
    Downloads the model from Hugging Face if not found locally.
    """
    if os.path.isdir(model_id):
        logger.info(f"Model found locally at: {model_id}")
        return

    logger.info(f"Checking/Downloading model from Hugging Face: {model_id}")
    try:
        # We allow patterns relevant to the components we use: vae, transformer, text_encoder, tokenizer, scheduler
        # But for simplicity, we just download the repo. diffusers usually downloads what it needs.
        # Check if it's already cached first? snapshot_download handles that.
        snapshot_download(repo_id=model_id, allow_patterns=["*vae*", "*transformer*", "*text_encoder*", "*tokenizer*", "*scheduler*", "*config.json*"]) 
        logger.info("Model download check complete.")
    except Exception as e:
        logger.warning(f"Download attempt failed: {e}. Will attempt to proceed with standard loading which might trigger its own download.")

def main():
    args = get_args()
    
    if not os.path.exists(args.output_dir):
        os.makedirs(args.output_dir)
        
    logger.info(f"Starting export for model: {args.model_id}")
    
    # Ensure model is available
    download_model(args.model_id)
    
    logger.info(f"Output directory: {args.output_dir}")
    logger.info(f"Target device: {args.device}")
    
    dtype = torch.float16 if args.fp16 else torch.float32
    logger.info(f"Export dtype: {dtype}")

    if args.component in ["all", "vae"]:
        export_vae(args.model_id, args.output_dir, args.opset, args.device, args.validate, dtype)
        if args.export_tensorrt:
            build_tensorrt_engine(os.path.join(args.output_dir, "vae_decoder.onnx"), args.output_dir, "vae_decoder", args.trt_workspace, args.trt_fp16, args.trt_log_level)
            gc.collect()
            torch.cuda.empty_cache()
        
    if args.component in ["all", "transformer"]:
        export_transformer(args.model_id, args.output_dir, args.opset, args.device, args.validate, dtype)
        if args.export_tensorrt:
            build_tensorrt_engine(os.path.join(args.output_dir, "transformer.onnx"), args.output_dir, "transformer", args.trt_workspace, args.trt_fp16, args.trt_log_level)
            gc.collect()
            torch.cuda.empty_cache()
        
    if args.component in ["all", "text_encoder"]:
        export_text_encoder(args.model_id, args.output_dir, args.opset, args.device, args.validate, dtype)
        if args.export_tensorrt:
            build_tensorrt_engine(os.path.join(args.output_dir, "text_encoder.onnx"), args.output_dir, "text_encoder", args.trt_workspace, args.trt_fp16, args.trt_log_level)
            gc.collect()
            torch.cuda.empty_cache()
        
    logger.info("Cleaning up RAM and VRAM...")
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()

    logger.info("Export process complete.")

if __name__ == "__main__":
    main()
