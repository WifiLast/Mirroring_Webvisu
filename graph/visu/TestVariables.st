TYPE GRAPH_AXIS :
STRUCT
	label: WSTRING;
	data: ARRAY[0..10] OF REAL;
	borderColor : WSTRING;
	fill : WSTRING;
END_STRUCT
END_TYPE

PROGRAM PLC_PRG
VAR
    (* Define the struct variable *)
    myAxis : GRAPH_AXIS;
    
    (* Trigger variable to update data *)
    bUpdateChart : BOOL := FALSE;
    
    sInputLabels : STRING(1000); 
END_VAR

(* Implementation *)

IF bUpdateChart THEN
    (* 1. Configure properties using the Struct *)
    myAxis.label := "Temperature Sensor 1";
    myAxis.borderColor := "blue";
    myAxis.fill := "false";
    
    (* 2. Set Data Array *)
    myAxis.data[0] := 22.5;
    myAxis.data[1] := 23.0;
    myAxis.data[2] := 21.8;
    myAxis.data[3] := 24.1;
    myAxis.data[4] := 22.9;
    
    (* 3. Set Labels (JSON String) *)
    sInputLabels := '["10:00", "10:15", "10:30", "10:45", "11:00"]';
    
    bUpdateChart := FALSE;
END_IF
