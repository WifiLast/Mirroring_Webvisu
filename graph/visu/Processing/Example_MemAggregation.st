PROGRAM Example_MemAggregation
VAR
    fbAgg : FB_MemAggregation;
    rSensorVal : REAL := 20.0;
    rAggResult : REAL;
    
    // Test Signal Generation
    fbTimer : TON := (PT := T#1S); // 1s trigger
    xTrigger : BOOL;
    
    // Configuration
    eSetSpan : E_TimeSpan := E_TimeSpan.LAST_15M;
    eSetAgg : E_AggType := E_AggType.AGG_AVERAGE;
END_VAR

// 1s Update Loop (Simulates cyclic task)
fbTimer(IN := NOT fbTimer.Q);
IF fbTimer.Q THEN
    xTrigger := TRUE;
    
    // Simulate Noise/Change
    rSensorVal := rSensorVal + 0.1;
    IF rSensorVal > 30.0 THEN rSensorVal := 20.0; END_IF
ELSE
    xTrigger := FALSE;
END_IF

// Call Aggregation
fbAgg(
    xExecute := xTrigger,
    rInput := rSensorVal,
    eTimeSpan := eSetSpan,
    eAggType := eSetAgg,
    xReset := FALSE
);

// Read Result
rAggResult := fbAgg.rResult;

// Note: rResult updates every time xExecute triggers (every 1s).
// For 15M, it updates immediately.
// For 6H (1min resolution), it updates the Ring Buffer only once per minute, 
// so rResult might stay stable until next minute update? 
// No, the logic calculates average of EXISTING buffer each cycle. 
// So it stays stable until buffer changes.
