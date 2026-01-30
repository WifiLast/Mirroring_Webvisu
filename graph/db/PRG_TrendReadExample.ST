// Example program, that access the trend storage
PROGRAM TrendStorageAPI_TestProg
VAR
	xInitialized : BOOL;
	instTrendStorageReader 			: TrendStorageReader; 
	instTrendStorageWriterListener	: TrendStorageWriterListener;
	instTrendStorageReaderConsumer	: TrendStorageReaderConsumer;
	
	// Usecase 1:
	eError							: VisuTrendStorageAccess.ETrendStorageReaderErrors;
	liMinTimestamp					: LINT;
	liMaxTimestamp					: LINT;
	timeDateMin						: SYSTIMEDATE;
	uiMicrosecondsMin				: UINT;
	timeDateMax						: SYSTIMEDATE;
	uiMicrosecondsMax				: UINT;
	
	// Usecase 2:
	xDoReadTest2					: BOOL;
	eError2							: VisuTrendStorageAccess.ETrendStorageReaderErrors;
	liTimstampFrom2					: LINT;
	liTimstampTo2					: LINT;
	iLoopCounter					: INT;
	
	xStopContinueReading			: BOOL;

	xComputeTimestamps				: BOOL;
	xComputeDateTime				: BOOL;
	timeDateFrom2					: SYSTIMEDATE;
	uiMicrosecondsFrom2				: UINT;
	timeDateTo2						: SYSTIMEDATE;
	uiMicrosecondsTo2				: UINT;
	
	ChartOne : GRAPH_AXIS;
	sLabelOne : STRING(2000);
	
	    stUTC_DateAndTime : SYSTIME;

    Result : RTS_IEC_RESULT;

    ldtNow : LDATE_AND_TIME;
    ltodNow : LTIME_OF_DAY;
    ldatNow : LDATE;

    stUTC_Timestamp : SysTime;
    stLocal_TimeStamp : SysTime;
    stdNow : SysTimeDate;

    dtNow : DATE_AND_TIME;
    todNow : TIME_OF_DAY;
    datNow : DATE;   
    datToday : DATE; 
END_VAR


// Required call to Initialize before any methods of the TrendStorageReader instance can be used
Result := SysTimeRtcHighResGet(stUTC_DateAndTime); // UlINT#1738934115369

ldtNow := TO_LDT(stUTC_DateAndTime * LTIME#1ms); // LDT#2025-2-7-13:15:15.369000000
ltodNow := TO_LTOD(ldtNow); // LTOD#13:15:15.369000000
ldatNow := TO_LDATE(ldtNow); // LD#2025-2-7


Result := SysTimeRtcHighResGet(stUTC_Timestamp); // ULINT#1528273494913
Result := SysTimeRtcConvertHighResToLocal(stUTC_Timestamp, stdNow);

Result := SysTimeRtcConvertDateToHighRes(stdNow, stLocal_TimeStamp); // ULINT#1528280694913

dtNow := TO_DT(stLocal_TimeStamp / TIME#1ms); // DT#2018-6-6-10:24:54
todNow := TO_TOD(stLocal_TimeStamp MOD TO_ULINT(T#1D)); // TOD#10:24:54.913
datToday := TO_DATE(dtNow); // D#2018-6-6

IF NOT xInitialized THEN
	xInitialized := TRUE;
	instTrendStorageReader.Initialize(sPacketName := 'Trend1');
	// Usecase 3: Notification, if new data is available in the trend storage.
	// This optional call is necessary, if we want to be informed, if new data has been written
	// to the trend storage.
	instTrendStorageReader.AddTrendStorageWriterListener(instTrendStorageWriterListener);
END_IF

// Usecase 1: Determine the min/max timestamp range, for which data is available in the trend storage
eError := instTrendStorageReader.GetMinMaxTimestamps(
	liMinTimestamp			=> liMinTimestamp,
	liMaxTimestamp			=> liMaxTimestamp
);

// Comvert the timestamps in a human readable form
TrendStorageConvertFromTimestamp(liTimestamp := liMinTimestamp, timeDate => timeDateMin, uiMicroseconds => uiMicrosecondsMin);
TrendStorageConvertFromTimestamp(liTimestamp := liMaxTimestamp, timeDate => timeDateMax, uiMicroseconds => uiMicrosecondsMax);

// Usecase 2: Read values from the trend storage
// The data returned by the read process is truncated into small pieces. The 1st call is a call
// of method Read. In case of return code VisuTrendStorageAccess.ETrendStorageReaderErrors.AdditionalReadCallRequired
// additional calls are necessary, but calls to method ContinueReading.
IF eError2 = VisuTrendStorageAccess.ETrendStorageReaderErrors.AdditionalReadCallRequired THEN
	iLoopCounter := iLoopCounter + 1;
	VisuElems.Visu_Output_2('Call to ContinueReading ', INT_TO_STRING(iLoopCounter), 4);
	eError2 := instTrendStorageReader.ContinueReading(
		liTimstampFrom					:= liTimstampFrom2,
		liTimstampTo					:= liTimstampTo2,
		itfTrendStorageReaderConsumer	:= instTrendStorageReaderConsumer
	);
END_IF

IF xDoReadTest2 THEN
	xDoReadTest2 := FALSE;

	iLoopCounter := 0;
	instTrendStorageReaderConsumer.diTotalCountRows := 0;
	
	instTrendStorageReaderConsumer.SetDestination(pChartData := ADR(ChartOne), pLabelString := ADR(sLabelOne), tStart := dtNow);
	
	// Always read full range
    liTimstampFrom2 := liMinTimestamp;
    liTimstampTo2 := liMaxTimestamp;
	
	eError2 := instTrendStorageReader.Read(
		liTimstampFrom					:= liTimstampFrom2,
		liTimstampTo					:= liTimstampTo2,
		itfTrendStorageReaderConsumer	:= instTrendStorageReaderConsumer
	);
END_IF

// This helps us to abort a long running read call
IF xStopContinueReading THEN
	xStopContinueReading := FALSE;
	// This stops the reading
	eError2 := VisuTrendStorageAccess.ETrendStorageReaderErrors.NoError;
END_IF

IF xComputeTimestamps THEN
	xComputeTimestamps := FALSE;
	
	liTimstampFrom2 := TrendStorageConvertToTimestamp(timeDateFrom2, uiMicrosecondsFrom2);
	liTimstampTo2 := TrendStorageConvertToTimestamp(timeDateTo2, uiMicrosecondsTo2);
END_IF

IF xComputeDateTime THEN
	 xComputeDateTime := FALSE;
	 
	TrendStorageConvertFromTimestamp(liTimestamp := liTimstampFrom2, timeDate => timeDateFrom2, uiMicroseconds => uiMicrosecondsFrom2);
	TrendStorageConvertFromTimestamp(liTimestamp := liTimstampTo2, timeDate => timeDateTo2, uiMicroseconds => uiMicrosecondsTo2);
END_IF