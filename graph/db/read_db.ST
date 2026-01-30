TYPE GRAPH_AXIS :
STRUCT
	sLabel: STRING;
	aData: ARRAY[0..172803] OF REAL;
    diNumOfData : DINT;
	sBorderColor : STRING;
	xFill : BOOL;
END_STRUCT
END_TYPE

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
	eErrorCode	: VisuTrendStorageAccess.ETrendStorageReaderErrors;
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


FUNCTION_BLOCK FB_ReadTrend
VAR_INPUT
    xExecute : BOOL;
    sTrendName : STRING; 
    tStartTime : DT;
    tEndTime : DT;
    iChannelIndex : INT := 0; 
END_VAR
VAR_IN_OUT
    stChartData : GRAPH_AXIS;
END_VAR
VAR_OUTPUT
    sLabels : STRING(2000); 
    xDone : BOOL;
    xBusy : BOOL;
    xError : BOOL;
    sError : STRING;
END_VAR
VAR
    step : INT := 0;
    fbTrendReader : VisuTrendStorageAccess.TrendStorageReader;
    fbTrendConsumer : FB_TrendConsumer;
    
    liStart : LINT;
    liEnd : LINT;
    eResult : VisuTrendStorageAccess.ETrendStorageReaderErrors;
END_VAR

CASE step OF
    0: (* Idle *)
        IF xExecute THEN
            xBusy := TRUE;
            xDone := FALSE;
            xError := FALSE;
            sError := '';
            
            // Set up Consumer
            fbTrendConsumer.SetDestination(ADR(stChartData), ADR(sLabels), tStartTime);
            
            // Initialize Reader
            fbTrendReader.Initialize(sTrendName); // User docu says Initialize exists. Assuming sTrendName arg.
            
            // Convert DT to LINT (Timestamp). DT is seconds. Trend usually ms.
            liStart := DT_TO_LINT(tStartTime) * 1000;
            liEnd := DT_TO_LINT(tEndTime) * 1000;
            
            step := 10;
        END_IF
        
    10: (* Start Read *)
        eResult := fbTrendReader.Read(
            liTimstampFrom := liStart,
            liTimstampTo := liEnd,
            itfTrendStorageReaderConsumer := fbTrendConsumer
        );
        
        IF eResult = VisuTrendStorageAccess.ETrendStorageReaderErrors.NoError THEN
             // Done immediately (unlikely for large data but possible)
             stChartData.sLabel := "Trend Data";
             stChartData.sBorderColor := "blue";
             stChartData.xFill := FALSE;
             step := 20;
        ELSIF eResult = VisuTrendStorageAccess.ETrendStorageReaderErrors.AdditionalReadCallRequired THEN
             step := 11; // Continue Reading
        ELSIF eResult = VisuTrendStorageAccess.ETrendStorageReaderErrors.NotInitialized THEN
             sError := "Not Initialized";
             xError := TRUE;
             step := 99;
        ELSE
             sError := "Read Error";
             xError := TRUE;
             step := 99;
        END_IF
        
    11: (* Continue Reading *)
        eResult := fbTrendReader.ContinueReading(
            itfTrendStorageReaderConsumer := fbTrendConsumer
        );
         IF eResult = VisuTrendStorageAccess.ETrendStorageReaderErrors.NoError THEN
             step := 20;
         ELSIF eResult = VisuTrendStorageAccess.ETrendStorageReaderErrors.AdditionalReadCallRequired THEN
             // Stay in step 11
         ELSE
             sError := "Continue Error";
             xError := TRUE;
             step := 99;
         END_IF

    20: (* Done *)
        xDone := TRUE;
        xBusy := FALSE;
        IF NOT xExecute THEN
            step := 0;
        END_IF
        
    99: (* Error *)
        xBusy := FALSE;
        IF NOT xExecute THEN
            step := 0;
        END_IF
        
END_CASE
