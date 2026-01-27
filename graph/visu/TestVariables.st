TYPE GRAPH_AXIS :
STRUCT
	label: WSTRING;
	data: ARRAY[0..172803] OF REAL;
	borderColor : WSTRING;
	fill : WSTRING;
END_STRUCT
END_TYPE

PROGRAM PLC_PRG
VAR
    (* Dataset 1 *)
    myAxis : GRAPH_AXIS;
    
    (* Dataset 2 *)
    myAxis2 : GRAPH_AXIS;
    
    (* Chart Config *)
    sInputLabels : STRING(2000); 
    bShowAxis2 : BOOL := TRUE;
    sAxis1Label : STRING := 'Temperature (C)';
    sAxis2Label : STRING := 'Pressure (Bar)';
    
    (* Limits *)
    sLimit1Value : STRING := '24.0'; (* Red Dashed *)
    sLimit2Value : STRING := '21.0'; (* Orange Dashed *)
    
    (* Trigger *)
    bUpdateChart : BOOL := FALSE;
END_VAR

(* Implementation *)

IF bUpdateChart THEN
    (* Dataset 1 config *)
    myAxis.label := "Temp Sensor";
    myAxis.borderColor := "blue";
    myAxis.fill := "false";
    myAxis.data[0] := 22.5;
    myAxis.data[1] := 23.0;
    myAxis.data[2] := 21.8;
    myAxis.data[3] := 24.5; (* Exceeds limit1 *)
    
    (* Dataset 2 config *)
    myAxis2.label := "Press Sensor";
    myAxis2.borderColor := "green";
    myAxis2.fill := "false";
    myAxis2.data[0] := 5.0;
    myAxis2.data[1] := 5.2;
    myAxis2.data[2] := 4.9;
    myAxis2.data[3] := 6.1;

    (* Labels *)
    sInputLabels := '["10:00", "10:15", "10:30", "10:45"]';
    
    bUpdateChart := FALSE;
END_IF
