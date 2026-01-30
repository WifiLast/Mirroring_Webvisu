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
            liTimstampFrom := liStart,
            liTimstampTo := liEnd,
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
