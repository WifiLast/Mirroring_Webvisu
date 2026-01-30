PROGRAM read_trend
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
    sTrendName : STRING := 'Trend1'; (* MUST match the Trend Recording name *)
    
    (* Helper to calc times *)
    tDuration : TIME := T#1H; (* Read last 1 hour to ensure we get at least 100 points *)
    dtNow : DT; 
    
    (* Time Helper *)
    stUTC_DateAndTime : SysTimeRtc.SYSTIME;
    ldtNow : LDATE_AND_TIME;
    udiResult : RTS_IEC_RESULT;
    
    (* Post-processing *)
    i : DINT;
    diOffset : DINT;
END_VAR

// Cyclic Call to update time
udiResult := SysTimeRtc.SysTimeRtcHighResGet(stUTC_DateAndTime);
ldtNow := TO_LDT(stUTC_DateAndTime * LTIME#1ms);
dtNow := TO_DT(ldtNow);

IF xReadTrigger AND NOT xBusy THEN
    (* 1. Setup Time Range *)
    dtEndTime := dtNow;
    
    // Prevent underflow
    IF dtNow > TO_DT(TIME_TO_DWORD(tDuration)) THEN
        dtStartTime := dtNow - tDuration;
    ELSE
        dtStartTime := DT#1970-01-01-00:00:00;
    END_IF
    
    (* 2. Reset Status *)
    xReadTrigger := FALSE; 
    
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
        xExecute := FALSE, 
        stChartData := stMyChartData
    );
END_IF

(* Output Mapping *)
xDone := fbTrendReader.xDone;
xBusy := fbTrendReader.xBusy;
xError := fbTrendReader.xError;
sErrorMessage := fbTrendReader.sError;
sMyLabels := fbTrendReader.sLabels;

(* 4. Truncate to last 100 if needed *)
IF xDone AND NOT xError THEN
    IF stMyChartData.diNumOfData > 100 THEN
        diOffset := stMyChartData.diNumOfData - 100;
        
        // Shift data to the left
        FOR i := 0 TO 99 DO
            stMyChartData.aData[i] := stMyChartData.aData[i + diOffset];
        END_FOR
        
        // Update count
        stMyChartData.diNumOfData := 100;
        
        // Note: Labels are string based and harder to shift perfectly without parsing 'sLabels', 
        // so we might leave them or clear them if strict alignment is needed. 
        // For now, we leave them as is, but data is truncated.
    END_IF
END_IF
