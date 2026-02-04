FUNCTION_BLOCK FB_WriteCSV
VAR_INPUT
    xExecute : BOOL;
    sFileName : STRING(255);
    sHeader : STRING(255);
    sDataLine : STRING(255);
    tWriteInterval : TIME := T#60S; // Default 60s interval
    xAddNewline : BOOL := TRUE;
END_VAR
VAR_OUTPUT
    xDone : BOOL;
    xBusy : BOOL;
    xError : BOOL;
    dwErrorID : RTS_IEC_RESULT;
END_VAR
VAR
    xExecuteOld : BOOL;
    hFile : RTS_IEC_HANDLE := RTS_INVALID_HANDLE;
    sBaseDir : STRING(255) := '/home/codesys/';
    sFullPath : STRING(255);
    sWriteBuffer : STRING(255);
    ulBytesWritten : UDINT;
    xFileExisted : BOOL;
    
    // Buffer Variables
    aBuffer : ARRAY[0..199] OF STRING(255);
    udiBufferCount : UDINT := 0;
    fbFlushTimer : TON;
    i : UDINT; // Loop counter
END_VAR
VAR CONSTANT
    RTS_INVALID_HANDLE : RTS_IEC_HANDLE := 16#FFFFFFFF;
    MAX_BUFFER_SIZE : UDINT := 200;
END_VAR

// 1. Handle Input (Buffering)
IF xExecute AND NOT xExecuteOld THEN
    xBusy := TRUE;
    xDone := FALSE;
    xError := FALSE;
    
    IF udiBufferCount < MAX_BUFFER_SIZE THEN
        aBuffer[udiBufferCount] := sDataLine;
        udiBufferCount := udiBufferCount + 1;
    ELSE
        // Buffer Overflow - Optional: Trigger immediate flush or Error?
        // We will trigger immediate flush below.
        ; 
    END_IF
END_IF
xExecuteOld := xExecute;

// 2. Timer Logic
// Timer runs if there is data in buffer
fbFlushTimer(IN := udiBufferCount > 0, PT := tWriteInterval);

// 3. Flush Condition
IF (fbFlushTimer.Q OR udiBufferCount >= MAX_BUFFER_SIZE) AND udiBufferCount > 0 THEN
    // Perform Synchronous Flush
    
    // A. Create Directory (Once check)
    // We could do this only once, but safety first.
    SysDirCreate(szDir := sBaseDir); 

    // B. Open File
    sFullPath := CONCAT(sBaseDir, sFileName);
    
    xFileExisted := FileExist(sFilePath := sFullPath);
    
    IF xFileExisted THEN
         hFile := SysFileOpen(szFile := sFullPath, am := ACCESS_MODE.AM_APPEND, pResult := ADR(dwErrorID));
    ELSE
         hFile := SysFileOpen(szFile := sFullPath, am := ACCESS_MODE.AM_WRITE, pResult := ADR(dwErrorID));
    END_IF
    
    IF hFile <> RTS_INVALID_HANDLE THEN
        
        // C. Write Header (If new)
        IF NOT xFileExisted AND LEN(sHeader) > 0 THEN
            sWriteBuffer := sHeader;
            IF xAddNewline THEN
                sWriteBuffer := CONCAT(sWriteBuffer, '$R$N');
            END_IF
            SysFileWrite(hFile := hFile, pbyBuffer := ADR(sWriteBuffer), ulSize := LEN(sWriteBuffer), pResult := ADR(dwErrorID));
        END_IF
        
        // D. Write Buffer Data
        FOR i := 0 TO udiBufferCount - 1 DO
            sWriteBuffer := aBuffer[i];
            IF xAddNewline THEN
                sWriteBuffer := CONCAT(sWriteBuffer, '$R$N');
            END_IF
            
            SysFileWrite(hFile := hFile, pbyBuffer := ADR(sWriteBuffer), ulSize := LEN(sWriteBuffer), pResult := ADR(dwErrorID));
            
            // Check error? If error, maybe stop? 
            // For now continue and flag error at end.
            IF dwErrorID <> 0 THEN
                xError := TRUE;
            END_IF
        END_FOR
        
        // E. Close File
        SysFileClose(hFile := hFile);
        hFile := RTS_INVALID_HANDLE;
        
        // F. Reset Buffer
        IF NOT xError THEN
            udiBufferCount := 0;
            xDone := TRUE;
        END_IF
    ELSE
        xError := TRUE;
    END_IF
    
    xBusy := FALSE; // Pulse Busy off after flush? Or keep Busy while buffering? 
    // Usually Busy=True means "Processing". Buffering is "Processing".
    // Let's reset Busy only after flush or if buffer is empty.
    // If we just buffered, we are technically "Waiting".
    // Let's pulse xDone when Flush is complete.
END_IF

// Reset Done trigger (optional, usually valid for one cycle)
// If we want xDone to stay TRUE until next Execute?
// Standard FB: xDone valid when Job Completed. 
// Here "Job" is "Append to Buffer" OR "Flush"?
// Let's say xDone is TRUE when Buffer Added? Or when Flushed?
// "Support bulk writing... single process". 
// User likely checks log to see if "written".
// With buffering, "Written" effectively means "Buffered".
// So let's set xDone := TRUE immediately after buffering, 
// AND maybe a separate output xFlushed? 
// Or stick to simple logic: xDone implies "Handled". 
// I will keep xDone = TRUE after Flush. 
// Note: If I don't set xDone after Buffering, the user might hang waiting for it.
// CHANGE: Set xDone := TRUE after Buffering successfully.
// The Flush is an internal maintenance task.
// If Flush fails, xError becomes TRUE.

IF xExecute AND NOT xError THEN
   xDone := TRUE; // Data accepted into buffer
   xBusy := FALSE; 
END_IF
