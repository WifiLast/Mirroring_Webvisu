PROGRAM test_Value
VAR
    stChartData : GRAPH_AXIS;
    xInit : BOOL := TRUE;
END_VAR

(* Initialize only once or on demand *)
IF xInit THEN
    (* 1. Set Style Properties - Using fields from graph/db/GRAPH_AXIS.ST *)
    stChartData.sLabel := 'Fixed Values Demo';
    stChartData.sBorderColor := 'rgb(54, 162, 235)'; (* Blue *)
    stChartData.xFill := FALSE;

    (* 2. Set 10 Fixed Data Points *)
    stChartData.aData[0] := 10.0;
    stChartData.aData[1] := 20.0;
    stChartData.aData[2] := 15.5;
    stChartData.aData[3] := 25.0;
    stChartData.aData[4] := 30.0;
    stChartData.aData[5] := 10.0;
    stChartData.aData[6] := 5.0;
    stChartData.aData[7] := 12.0;
    stChartData.aData[8] := 18.0;
    stChartData.aData[9] := 22.0;
    
    (* Set the number of valid data points *)
    stChartData.diNumOfData := 10;
       
    xInit := FALSE;
END_IF
