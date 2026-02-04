PROGRAM Example_ReadCSV
VAR
    fbReadCSV : FB_ReadCSV;
    xTriggerRead : BOOL;
    aMyData : ARRAY[0..99] OF STRING(255);
    udiCount : UDINT;
END_VAR

// Call the Function Block
fbReadCSV(
    xExecute := xTriggerRead,
    sFileName := 'log.csv'
);

// Capture results when done
IF fbReadCSV.xDone THEN
    aMyData := fbReadCSV.aFileLines;
    udiCount := fbReadCSV.udiLineCount;
    xTriggerRead := FALSE; 
END_IF

// Handle Error
IF fbReadCSV.xError THEN
    xTriggerRead := FALSE;
END_IF
