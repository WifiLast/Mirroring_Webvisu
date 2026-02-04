PROGRAM Example_WriteCSV
VAR
    fbWriteCSV : FB_WriteCSV;
    xTriggerWrite : BOOL;
    
    // Aggregation Blocks
    fbAggHum : FB_MemAggregation;
    fbAggTemp : FB_MemAggregation;
    fbAggPress : FB_MemAggregation;
    
    // Data String
    sMyData : STRING(255);
    sCSVHeader : STRING(255) := 'Timestamp,Humidity_Avg,Temperature_Avg,Pressure_Avg';
    
    // Simulated Sensor Data
    rHumidity : REAL := 45.0;
    rTemperature : REAL := 22.5;
    rPressure : REAL := 1013.0;
    dtNow : DT := DT#2023-10-27-10:00:00;
    stLocal_TimeStamp : SysTime; 
    
    // Timer for generating data (Fast: 100ms)
    fbDataTimer : TON := (PT := T#100MS);
    
    iCount : INT := 0;
	
	// time 	
	stLocal_TimeStamp : SysTime;

END_VAR

dtNow := TO_DT(stLocal_TimeStamp / TIME_TO_ULINT(TIME#1MS)); // DT#2018-6-6-10:24:54
// Trigger write every 100ms
fbDataTimer(IN := NOT fbDataTimer.Q);
IF fbDataTimer.Q THEN
    xTriggerWrite := TRUE;
    
    // Simulate changing data (Noise)
    rHumidity := rHumidity + 0.1;
    IF rHumidity > 60 THEN rHumidity := 45; END_IF
    
    rTemperature := rTemperature + 0.05;
    IF rTemperature > 30 THEN rTemperature := 20; END_IF
    
    rPressure := rPressure + 0.2;
    IF rPressure > 1020 THEN rPressure := 1000; END_IF
    
    // Update Aggregators (e.g. LAST_15M Average)
    fbAggHum(xExecute := TRUE, rInput := rHumidity, eTimeSpan := E_TimeSpan.LAST_15M, eAggType := E_AggType.AGG_AVERAGE);
    fbAggTemp(xExecute := TRUE, rInput := rTemperature, eTimeSpan := E_TimeSpan.LAST_15M, eAggType := E_AggType.AGG_AVERAGE);
    fbAggPress(xExecute := TRUE, rInput := rPressure, eTimeSpan := E_TimeSpan.LAST_15M, eAggType := E_AggType.AGG_AVERAGE);
    
    // Format Data using RAW Sensor Data
    sCSVHeader := 'Timestamp,Humidity,Temperature,Pressure';
    
    sMyData := DT_TO_STRING(dtNow);
    sMyData := CONCAT(sMyData, ',');
    sMyData := CONCAT(sMyData, REAL_TO_STRING(rHumidity));
    sMyData := CONCAT(sMyData, ',');
    sMyData := CONCAT(sMyData, REAL_TO_STRING(rTemperature));
    sMyData := CONCAT(sMyData, ',');
    sMyData := CONCAT(sMyData, REAL_TO_STRING(rPressure));
    
    // Update GVL for Visualization
    GVL_Data.rVisuTemperature := rTemperature;
    GVL_Data.dtVisuTimestamp := dtNow;
    GVL_Data.sVisuTimestampString := DT_TO_STRING(dtNow);
    
ELSE
    // Reset Execute pulse for Aggregators (if needed, but xExecute := TRUE above acts as pulse if in IF block?)
    // Actually standard FB usually needs FALSE then TRUE for edge?
    // FB_MemAggregation checks "IF xExecute THEN". 
    // If we call it only inside IF fbDataTimer.Q, it is TRUE for that cycle.
    // But we MUST call FBs cyclically if they have internal state management that needs it?
    // FB_MemAggregation strictly acts "IF xExecute THEN". So calling it only on trigger is fine IF we don't need it to do anything else (like internal timers).
    // Our FB_MemAggregation doesn't have internal timers, just buffer logic.
    // So calling it inside the IF block is acceptable for this logic.
    ;
END_IF

// Call the CSV Writer
// Buffer data every time xTriggerWrite is True (every 100ms)
fbWriteCSV(
    xExecute := xTriggerWrite,
    sFileName := 'sensor_log.csv',
    sHeader := sCSVHeader,
    sDataLine := sMyData,
    tWriteInterval := T#60S, 
    xAddNewline := TRUE
);

// Reset trigger immediately
IF xTriggerWrite THEN
    xTriggerWrite := FALSE;
END_IF
