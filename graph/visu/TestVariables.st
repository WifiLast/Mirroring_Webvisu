PROGRAM PLC_PRG
VAR
    (* Define strings long enough to hold the JSON data *)
    sInputLabels : STRING(1000); 
    sDatasets : STRING(2000);
    
    (* Trigger variable to update data *)
    bUpdateChart : BOOL := FALSE;
END_VAR

(* Implementation *)

IF bUpdateChart THEN
    (* JSON Array for Labels - Month names *)
    (* Note: Use single quotes to wrap the ST string, and double quotes for JSON content *)
    sInputLabels := '["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]';
    
    (* JSON Array of Objects for Datasets *)
    (* Contains 2 datasets: Temperature (Red) and Pressure (Blue) *)
    sDatasets := '[{"label": "Temperature", "data": [10, 25, 15, 30, 22, 18, 28], "borderColor": "red", "fill": false}, {"label": "Pressure", "data": [100, 102, 98, 105, 101, 99, 103], "borderColor": "blue", "fill": false}]';
    
    bUpdateChart := FALSE;
END_IF
