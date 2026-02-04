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
    
    // Chart Data Struct (Humidity)
    axisHumidity : GRAPH_AXIS;
    
    // Chart Time Buffer (Last 20 points)
    aTimeHistory : ARRAY[0..19] OF DT; // 0-indexed to match typical array usage if preferred, but keeping explicit loop
    
    // Chart JSON Strings
    sChartData : STRING(2000);   // " [22.5, 23.1, ...] "
    sChartLabels : STRING(2000); // " ["DT#...", "DT#..."] "
    
    // Helpers
    i : INT;
    sTemp : STRING(50);
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
    
    // --- Update Chart History Buffer (Humidity) ---
    // Initialize Styles once (or cyclically, doesn't matter)
    axisHumidity.sLabel := 'Humidity (%)';
    axisHumidity.sBorderColor := 'blue';
    axisHumidity.xFill := FALSE;
    axisHumidity.diNumOfData := 20;

    // Shift older values (Size 20 buffer for demo)
    // Note: aData is 0..1000. We use 0..19.
    FOR i := 0 TO 18 DO
        axisHumidity.aData[i] := axisHumidity.aData[i+1];
        aTimeHistory[i] := aTimeHistory[i+1];
    END_FOR;
    // Add new value at end of buffer
    axisHumidity.aData[19] := rHumidity;
    aTimeHistory[19] := dtNow;
    
    // --- Generate JSON Strings ---
    // 1. Data: [45.1, 45.2, ...]
    sChartData := '[';
    FOR i := 0 TO 19 DO
        sChartData := CONCAT(sChartData, REAL_TO_STRING(axisHumidity.aData[i]));
        IF i < 19 THEN sChartData := CONCAT(sChartData, ', '); END_IF;
    END_FOR;
    sChartData := CONCAT(sChartData, ']');
    
    // 2. Labels: ["10:00", "10:15", ...] - Optimized for length (<255 chars)
    sChartLabels := '[';
    FOR i := 0 TO 19 DO
        // Convert to TOD and string: 'TOD#16:40:00'
        sTemp := TOD_TO_STRING(DT_TO_TOD(aTimeHistory[i]));
        // Remove 'TOD#' (4 chars)
        sTemp := DELETE(sTemp, 4, 1);
        // Keep only 'HH:mm' (5 chars)
        sTemp := LEFT(sTemp, 5);
        
        sChartLabels := CONCAT(sChartLabels, '"');
        sChartLabels := CONCAT(sChartLabels, sTemp);
        sChartLabels := CONCAT(sChartLabels, '"');
        IF i < 19 THEN sChartLabels := CONCAT(sChartLabels, ', '); END_IF;
    END_FOR;
    sChartLabels := CONCAT(sChartLabels, ']');
    
    
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
    GVL.rVisuTemperature := rTemperature;
    GVL.dtVisuTimestamp := dtNow;
    GVL.sVisuTimestampString := DT_TO_STRING(dtNow);
    
ELSE
    // Reset Execute pulse for Aggregators
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
