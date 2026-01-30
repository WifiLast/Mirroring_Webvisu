(* Consumer FB to receive data from TrendStorageReader *)
FUNCTION_BLOCK FB_TrendConsumer IMPLEMENTS VisuTrendStorageAccess.ITrendStorageReaderConsumer
VAR
    pAxis : POINTER TO GRAPH_AXIS;
    pLabels : POINTER TO STRING(2000);
    sLabels : STRING(2000); // Internal build buffer
    iMaxLabels : INT := 20;
    tStartTime : DT;
    iCurrentRow : DINT;
    rCurrentVal : REAL;
    xFirst : BOOL := TRUE;
END_VAR

METHOD SetDestination
VAR_INPUT
    pChartData : POINTER TO GRAPH_AXIS;
    pLabelString : POINTER TO STRING(2000);
    tStart : DT;
END_VAR
    pAxis := pChartData;
    pLabels := pLabelString;
    tStartTime := tStart;
    
    // Reset
    IF pAxis <> 0 THEN
        pAxis^.diNumOfData := 0;
    END_IF
    IF pLabels <> 0 THEN
        pLabels^ := '[';
        sLabels := '[';
    END_IF
    xFirst := TRUE;

METHOD ErrorOccurred
VAR_INPUT
	(* The error, that occurred*)
	eETrendStorageReaderErrors	: VisuTrendStorageAccess.ETrendStorageReaderErrors;
	(* Identifies the step, where the error occurred	*)
	eDuringWhichStep	: VisuTrendStorageAccess.ETrendStorageReaderStep;
END_VAR
    // Handled in main

METHOD ReadingDataCompleted
    // Finalize labels
    IF pLabels <> 0 THEN
        pLabels^ := CONCAT(pLabels^, ']');
    END_IF

METHOD TimestampRead
VAR_INPUT
	liTimestamp	: LINT;
END_VAR
VAR
    sTempLabel : STRING(20);
    dtCurrent : DT;
    diIndex : DINT;
END_VAR
    // Convert timestamp (uS or mS? Usually uS or mS from Trend. LINT is usually ms or us)
    // Assuming MS since 1970? Or LTIME?
    // Standard Trend timestamps are µs (microseconds) usually.
    // DT is Seconds.
    
    // For label generation:
    IF pAxis <> 0 AND pLabels <> 0 THEN
        diIndex := pAxis^.diNumOfData; // Current index we are about to fill (ValueRead comes next usually?)
        // Actually ValueRead might come before or after? Or multiple ValueReads per timestamp.
        // Usually TimestampRead comes once per row.
        
        // Let's assume one variable per row for now or check iWhichVariable in ValueRead.
        
        IF diIndex < 100 AND (diIndex < iMaxLabels) THEN
             // Convert to DT approx
             dtCurrent := TO_DT(liTimestamp / 1000); // if ms
             
             sTempLabel := DT_TO_STRING(dtCurrent);
             sTempLabel := RIGHT(sTempLabel, 8); 
             
             IF NOT xFirst THEN
                 pLabels^ := CONCAT(pLabels^, ', "');
             ELSE
                 pLabels^ := CONCAT(pLabels^, '"');
                 xFirst := FALSE;
             END_IF
             pLabels^ := CONCAT(pLabels^, sTempLabel);
             pLabels^ := CONCAT(pLabels^, '"');
        END_IF
    END_IF

METHOD ValueRead
VAR_INPUT
	diWhichRow	: DINT;
	iWhichVariable	: INT;
	liValue	: LINT;
	xValueNULL	: BOOL;
END_VAR
VAR
    diIndex : DINT;
END_VAR
    IF pAxis <> 0 THEN
        diIndex := pAxis^.diNumOfData;
        
        IF diIndex <= 172803 THEN
             // Convert LINT raw value to REAL. 
             // Note: Raw value in Trend is often scaled. LINT might be the raw int.
             // If variable is REAL in PLC, it is stored as bit pattern or scaled???
             // Standard Trend Storage often stores as LREAL or scaled INT. 
             // ValueRead signature says liValue : LINT.
             // If original var is REAL, treat LINT as bits? Or Cast?
             // For now assume direct cast or small scaling.
             pAxis^.aData[diIndex] := TO_REAL(liValue); 
             
             pAxis^.diNumOfData := pAxis^.diNumOfData + 1;
        END_IF
    END_IF

METHOD VariableConfigurationRead
VAR_INPUT
	pVariableConfiguration	: POINTER TO VisuTrendStorageAccess.TblTrendVariable;
	xIsFirstVariableConfiguration	: BOOL;
END_VAR
    // Optional
END_FUNCTION_BLOCK
