PROGRAM PRG_TrendReadExample
VAR
    (* Function Block Instance *)
    fbTrendReader : FB_ReadTrend;
    
    (* Data Structure for the Chart *)
    stMyChartData : GRAPH_AXIS;
    sMyLabels : STRING(2000);
    
    (* Control Variables *)
    xReadTrigger : BOOL;
    xDone : BOOL;
    xBusy : BOOL;
    xError : BOOL;
    sErrorMessage : STRING;
    
    (* Parameters *)
    dtStartTime : DT;
    dtEndTime : DT;
    sTrendName : STRING := 'Trend1'; (* MUST match the Trend Recording name in Visualization Manager *)
    
    (* Helper to calc times *)
    tDuration : TIME := T#1H; (* Read last 1 hour *)
    // fbGetTime : GetLocalTime; (* Placeholder: Use system specific time FB *)
    dtNow : DT := DT#2024-01-01-10:00:00; (* Replace with actual system time *)
END_VAR

(* 
    Example Usage:
    1. Set 'xReadTrigger' to TRUE to start reading.
    2. The FB will fetch data from 'Trend1' for the specified time range.
    3. 'stMyChartData' and 'sMyLabels' will be populated.
    4. Link 'stMyChartData' and 'sMyLabels' to your WebVisu Chart.
*)

IF xReadTrigger AND NOT xBusy THEN
    (* 1. Setup Time Range (Example: Last 1 Hour) *)
    // dtNow := ... (Get System Time here)
    dtEndTime := dtNow;
    dtStartTime := dtNow - tDuration;
    
    (* 2. Reset Status *)
    xReadTrigger := FALSE; (* Auto-reset trigger *)
    
    (* 3. Call FB *)
    fbTrendReader(
        xExecute := TRUE,
        sTrendName := sTrendName,
        tStartTime := dtStartTime,
        tEndTime := dtEndTime,
        stChartData := stMyChartData
    );
ELSE
    (* Cyclic Call *)
    fbTrendReader(
        xExecute := FALSE, (* Only TRUE for one cycle to start, or hold TRUE until Done? Implementation depends on FB logic *)
        (* Note: In the FB implementation, xExecute acts as a rising edge trigger for step 0->10 *)
        stChartData := stMyChartData
    );
END_IF

(* Output Mapping *)
sMyLabels := fbTrendReader.sLabels;
xDone := fbTrendReader.xDone;
xBusy := fbTrendReader.xBusy;
xError := fbTrendReader.xError;
sErrorMessage := fbTrendReader.sError;

(* 
   Visualization Linkage:
   - Pass 'stMyChartData' components (sLabel, aData, sBorderColor, xFill) to the Chart properties.
   - Pass 'sMyLabels' to the Chart's 'InputLabels' property.
*)
