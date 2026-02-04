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
    
    // Timer for generating data
    fbDataTimer : TON;
    tInterval : TIME := T#10S; // Fixed Data Acquisition Rate
    
    iCount : INT := 0;
    
    // Resolution Control
    // 0: 30m, 1: 15m, 2: 1h, 3: 6h, 4: 12h, 5: 24h, 6: 48h
    iResolutionMode : INT := 0; 
    iTimeWindow : DINT := 1800; // Time Window in Seconds passed to Chart
    
    // Chart Data Struct (Humidity)
    axisHumidity : GRAPH_AXIS;
    
    // Chart Time Buffer (Last 1000 points)
    aTimeHistory : ARRAY[0..999] OF DT; 
    
    // Chart JSON Strings (Not needed if mapping arrays directly)
    // sChartData : STRING(2000);   
    // sChartLabels : STRING(2000); 
    
    // Helpers
    i : INT;
    sTemp : STRING(50);

    udiUTC_DateAndTime : UDINT;
	udiLocal_DateAndTime : UDINT;
END_VAR

udiUTC_DateAndTime := TO_UDINT(SysTimeRtcGet(Result)); // UDINT#1528268918
Result := SysTimeRTCConvertUTCToLocal(udiUTC_DateAndTime, udiLocal_DateAndTime);
dtNow := TO_DT(udiLocal_DateAndTime);

// Set Time Window based on Selection (Resolution Mode now controls Zoom, not Acquisition)
CASE iResolutionMode OF
    0: iTimeWindow := 1800;   // 30 min
    1: iTimeWindow := 900;    // 15 min
    2: iTimeWindow := 3600;   // 1 h
    3: iTimeWindow := 21600;  // 6 h
    4: iTimeWindow := 43200;  // 12 h
    5: iTimeWindow := 86400;  // 24 h
    6: iTimeWindow := 172800; // 48 h
    ELSE iTimeWindow := 1800;
END_CASE

// Fixed Data Acquisition
fbDataTimer(IN := NOT fbDataTimer.Q, PT := tInterval);

// Trigger write
IF fbDataTimer.Q THEN
    xTriggerWrite := TRUE;
    
    // Simulate changing data (Noise)
    rHumidity := rHumidity + 0.1;
    IF rHumidity > 60 THEN rHumidity := 45; END_IF
    
    rTemperature := rTemperature + 0.05;
    IF rTemperature > 30 THEN rTemperature := 20; END_IF
    
    rPressure := rPressure + 0.2;
    IF rPressure > 1020 THEN rPressure := 1000; END_IF
    
    // --- Update Chart History Buffer (Humidity) ---
    axisHumidity.sLabel := 'Humidity (%)';
    axisHumidity.sBorderColor := 'blue';
    axisHumidity.xFill := FALSE;
    axisHumidity.diNumOfData := 1000;

    // Shift older values (Size 1000)
    FOR i := 0 TO 998 DO
        axisHumidity.aData[i] := axisHumidity.aData[i+1];
        aTimeHistory[i] := aTimeHistory[i+1];
    END_FOR;
    // Add new value at end of buffer
    axisHumidity.aData[999] := rHumidity;
    aTimeHistory[999] := dtNow;
    
    // NOTE: sChartData and sChartLabels JSON generation removed.
    // Map axisHumidity.aData and aTimeHistory directly to Chart Properties.
    
    
    // Update Aggregators
    fbAggHum(xExecute := TRUE, rInput := rHumidity, eTimeSpan := E_TimeSpan.LAST_15M, eAggType := E_AggType.AGG_AVERAGE);
    fbAggTemp(xExecute := TRUE, rInput := rTemperature, eTimeSpan := E_TimeSpan.LAST_15M, eAggType := E_AggType.AGG_AVERAGE);
    fbAggPress(xExecute := TRUE, rInput := rPressure, eTimeSpan := E_TimeSpan.LAST_15M, eAggType := E_AggType.AGG_AVERAGE);
    
    // Format Data for CSV
    sCSVHeader := 'Timestamp,Humidity,Temperature,Pressure';
    
    sMyData := DT_TO_STRING(dtNow);
    sMyData := CONCAT(sMyData, ',');
    sMyData := CONCAT(sMyData, REAL_TO_STRING(rHumidity));
    sMyData := CONCAT(sMyData, ',');
    sMyData := CONCAT(sMyData, REAL_TO_STRING(rTemperature));
    sMyData := CONCAT(sMyData, ',');
    sMyData := CONCAT(sMyData, REAL_TO_STRING(rPressure));
    
    // Update GVL for Visualization
    GVL.rVisuTemperature := rTemperature;
    GVL.dtVisuTimestamp := dtNow;
    GVL.sVisuTimestampString := DT_TO_STRING(dtNow);
    
ELSE
    // Reset Execute pulse for Aggregators
    ;
END_IF

// Call the CSV Writer
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
