TYPE E_TimeSpan :
(
    LAST_15M := 0,
    LAST_30M,
    LAST_1H,
    LAST_6H,
    LAST_12H,
    LAST_24H,
    LAST_48H
);
END_TYPE

TYPE E_AggType :
(
    AGG_AVERAGE := 0,
    AGG_MEDIAN
);
END_TYPE

FUNCTION_BLOCK FB_MemAggregation
VAR_INPUT
    xExecute : BOOL; // Cycle pulse (e.g. 1s)
    rInput : REAL;
    eTimeSpan : E_TimeSpan := E_TimeSpan.LAST_15M;
    eAggType : E_AggType := E_AggType.AGG_AVERAGE;
    xReset : BOOL;
END_VAR
VAR_OUTPUT
    rResult : REAL;
    xReady : BOOL; // Buffer is sufficiently filled
    udiCurrentCount : UDINT;
END_VAR
VAR
    // Ring Buffer (Max size for 1h/1s or 48h/1min = 3600 + overhead)
    // 48h * 60m = 2880 pts. 1h * 3600s = 3600 pts. Max is 3600.
    aRingBuffer : ARRAY[0..3599] OF REAL;
    udiHead : UDINT := 0; // Write Index
    udiCount : UDINT := 0; // Current items in buffer
    
    // Minute Downsampling Buffer
    aMinuteBuffer : ARRAY[0..59] OF REAL;
    udiMinIndex : UDINT := 0;
    
    // Configuration
    udiTargetSize : UDINT;
    xDownsample : BOOL; // TRUE if we aggregate 1s -> 1min
    
    // Internal
    xInitialized : BOOL;
    rSum : REAL;
    i : UDINT;
    j : UDINT;
    rTemp : REAL;
    aSortBuffer : ARRAY[0..3599] OF REAL; // For median sorting
    udiSortCount : UDINT;
END_VAR


// Reset Logic
IF xReset THEN
    udiHead := 0;
    udiCount := 0;
    udiMinIndex := 0;
    rResult := 0;
    xReady := FALSE;
    xInitialized := FALSE;
END_IF

// Configuration Setup (Run once or on change)
IF NOT xInitialized THEN
    CASE eTimeSpan OF
		E_TimeSpan.LAST_15M: udiTargetSize := 900;  xDownsample := FALSE; // 1s
		E_TimeSpan.LAST_30M: udiTargetSize := 1800; xDownsample := FALSE; // 1s
		E_TimeSpan.LAST_1H:  udiTargetSize := 3600; xDownsample := FALSE; // 1s
		E_TimeSpan.LAST_6H:  udiTargetSize := 360;  xDownsample := TRUE;  // 1min (360pts)
		E_TimeSpan.LAST_12H: udiTargetSize := 720;  xDownsample := TRUE;  // 1min (720pts)
		E_TimeSpan.LAST_24H: udiTargetSize := 1440; xDownsample := TRUE;  // 1min (1440pts)
		E_TimeSpan.LAST_48H: udiTargetSize := 2880; xDownsample := TRUE;  // 1min (2880pts)
    ELSE
        udiTargetSize := 900; xDownsample := FALSE;
    END_CASE
    xInitialized := TRUE;
END_IF

// Input Processing (On Execute Rising/High?) 
// Assuming xExecute is a pulse every second.
IF xExecute THEN
    
    IF xDownsample THEN
        // Collect into minute buffer
        IF udiMinIndex < 60 THEN
            aMinuteBuffer[udiMinIndex] := rInput;
            udiMinIndex := udiMinIndex + 1;
        END_IF
        
        // If minute full, calculate avg and push to Ring
        IF udiMinIndex >= 60 THEN
            rSum := 0;
            FOR i := 0 TO 59 DO
                rSum := rSum + aMinuteBuffer[i];
            END_FOR
            
            rTemp := rSum / 60.0;
            
            // PUSH to Ring
            aRingBuffer[udiHead] := rTemp;
            udiHead := udiHead + 1;
            IF udiHead >= udiTargetSize THEN
                udiHead := 0;
            END_IF
            IF udiCount < udiTargetSize THEN
                udiCount := udiCount + 1;
            END_IF
            
            // Reset Minute Buffer
            udiMinIndex := 0;
        END_IF
    ELSE
        // Direct Push (1s resolution)
        aRingBuffer[udiHead] := rInput;
        udiHead := udiHead + 1;
        IF udiHead >= udiTargetSize THEN
            udiHead := 0;
        END_IF
        IF udiCount < udiTargetSize THEN
            udiCount := udiCount + 1;
        END_IF
    END_IF
    
    // Calculate Final Result (Aggregated over Ring Buffer)
    // NOTE: For performance, Average could be optimized 'Rolling'.
    // Here we recalculate full buffer for simplicity/robustness.
    
    IF udiCount > 0 THEN
        IF eAggType = E_AggType.AGG_AVERAGE THEN
            // Calculate Average
            rSum := 0;
            FOR i := 0 TO udiCount - 1 DO
                rSum := rSum + aRingBuffer[i];
            END_FOR
            rResult := rSum / UDINT_TO_REAL(udiCount);
            
        ELSIF eAggType = E_AggType.AGG_MEDIAN THEN
            // Calculate Median (Expensive: Sort required)
            // Copy to sort buffer
            // SysMemCpy(ADR(aSortBuffer), ADR(aRingBuffer), ...); 
            // Manual copy to be safe
            FOR i := 0 TO udiCount - 1 DO
                aSortBuffer[i] := aRingBuffer[i];
            END_FOR
            
            // Bubble Sort (Simple, but O(N^2). 3600^2 is huge. 
            // Should be used carefully. Maybe optimized sort or standard lib sort?)
            // Keeping it simple for prototype. Warning: Cycle time!
            // Optimization: If performance is issue, use 'Running Median' approx or partial sort.
            
            udiSortCount := udiCount;
            FOR i := 0 TO udiSortCount - 2 DO
                FOR j := 0 TO udiSortCount - i - 2 DO
                    IF aSortBuffer[j] > aSortBuffer[j+1] THEN
                         rTemp := aSortBuffer[j];
                         aSortBuffer[j] := aSortBuffer[j+1];
                         aSortBuffer[j+1] := rTemp;
                    END_IF
                END_FOR
            END_FOR
            
            // Pick middle
            IF (udiSortCount MOD 2) <> 0 THEN
                // Odd: Middle element
                rResult := aSortBuffer[udiSortCount / 2];
            ELSE
                // Even: Avg of two middle
                rResult := (aSortBuffer[udiSortCount / 2] + aSortBuffer[(udiSortCount / 2) - 1]) / 2.0;
            END_IF
        END_IF
    ELSE
        rResult := 0;
    END_IF
    
    xReady := (udiCount >= udiTargetSize);
    udiCurrentCount := udiCount;
    
END_IF

// --------------------------------------------------------------------------
// Helper Method: PUSH to Ring Buffer
// We can't use 'METHOD' in simple ST file export unless structured correctly.
// We'll use inline code or internal Action if available.
// For ST file compatibility, I will just inline the logic above or call it via Action?
// No, standard ST expects FUNCTION_BLOCK to contain everything in body or methods.
// I used MEM_PUSH call above - I need to implement it or inline it.
// I will convert "MEM_PUSH(val)" to inline logic above.
// --------------------------------------------------------------------------
