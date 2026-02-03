PROGRAM ExampleData
VAR
    // Data Structure for the Table (Alarms mode)
    myAlarms : ALARMS;
    
    // Control Properties
    rOpacity : REAL := 1.0;
    sTableStyle : STRING := 'display compact hover';
    
    // Helpers
    i : INT;
    timer : TON;
    xInit : BOOL := FALSE;
END_VAR

// Initialization of dummy data
IF NOT xInit THEN
    FOR i := 0 TO 10 DO
        myAlarms.ALARMS[i].ID := CONCAT('ID_', INT_TO_STRING(i));
        myAlarms.ALARMS[i].EQUIP_ID := 'EQ_Main';
        myAlarms.ALARMS[i].Description := CONCAT('Alarm Description ', INT_TO_STRING(i));
        myAlarms.ALARMS[i].Value := (i MOD 2) = 0; // Alternating TRUE/FALSE
        myAlarms.ALARMS[i].TIMESTAMP := T#12h34m; // Static time for demo
    END_FOR
    
    // Clear the rest
    FOR i := 11 TO 1000 DO
        myAlarms.ALARMS[i].ID := '';
        myAlarms.ALARMS[i].Description := '';
    END_FOR
    
    xInit := TRUE;
END_IF

// Dynamic Update Demo (Optional: Change Opacity over time)
timer(IN := NOT timer.Q, PT := T#5S);
IF timer.Q THEN
    // Update a value to show live changes
    myAlarms.ALARMS[0].Value := NOT myAlarms.ALARMS[0].Value;
END_IF
