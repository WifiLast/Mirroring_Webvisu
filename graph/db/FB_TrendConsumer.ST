(* Consumer FB to receive data from TrendStorageReader *)
FUNCTION_BLOCK TrendStorageReaderConsumer IMPLEMENTS ITrendStorageReaderConsumer
VAR_INPUT
	// If this flag is TRUE an output like a csv export will be generated. Should be only
	// used, if not too much data is read from the trend storage
	xDetailedOutput						: BOOL;
	
	// This member is used to track the total number of rows, that have been read from the trend storage
	diTotalCountRows					: DINT;
END_VAR
VAR
	// This instance converts the values into a suitable representation, e.g. into a string
	m_instValueConverter				: TrendStorageReaderValueConverter;	

	// A line used to collect the data read from the trend storage
	m_sLine								: STRING(255);
	// Used to identify the rows
	m_diWhichRow						: DINT;
	
	m_diRowCounter						: DINT;
	// Used to track the minimum/maximum timestamp, that was read
	m_liTimestampMin					: LINT := 16#1FFFFFFFFFFFFFFF;
	m_liTimestampMax					: LINT := 0;
	
	pAxis : POINTER TO GRAPH_AXIS;
    pLabels : POINTER TO STRING(2000);
    sLabels : STRING(2000);
    tStartTime : DT;
    xFirst : BOOL;
    
    rLastNonZeroValue : REAL;
    
    // Deep Debugging
    liLastRawValue : LINT;
    iLastVarIndex : INT;
    diValueReadCalls : DINT;
    xLastNull : BOOL;
    iLastNonZeroIndex : INT := -1; // New debug variable
END_VAR

METHOD SetDestination
VAR_INPUT
    pChartData : POINTER TO GRAPH_AXIS;
    pLabelString : POINTER TO STRING(2000);
    tStart : DT;
END_VAR
    pAxis := pChartData;
    pLabels := pLabelString;
    tStartTime := tStart;
    
    // Reset
    IF pAxis <> 0 THEN
        pAxis^.diNumOfData := 0;
    END_IF
    IF pLabels <> 0 THEN
        pLabels^ := '[';
        sLabels := '[';
    END_IF
    xFirst := TRUE;
END_METHOD

METHOD ErrorOccurred
VAR_INPUT
	(* The error, that occurred*)
	eETrendStorageReaderErrors	: VisuTrendStorageAccess.ETrendStorageReaderErrors;
	(* Identifies the step, where the error occurred	*)
	eDuringWhichStep	: VisuTrendStorageAccess.ETrendStorageReaderStep;
END_VAR
    // Handled in main
END_METHOD

METHOD ReadingDataCompleted
VAR
	CMPID_LigLog: UDINT;
	sLogMessage : STRING(255);
END_VAR
IF xDetailedOutput THEN
	IF LEN(m_sLine) <> 0 THEN
		VisuElems.Visu_Output_3(DINT_TO_STRING(m_diWhichRow), ': ', m_sLine, 4);
	END_IF
	m_sLine := '';
ELSE
	diTotalCountRows := diTotalCountRows + m_diRowCounter;

	sLogMessage := CONCAT('ReadingDataCompleted, m_diRowCounter = ', CONCAT('ReadingDataCompleted, m_diRowCounter = ', CONCAT(', diTotalCountRows = ', DINT_TO_STRING(diTotalCountRows))));
	LogAdd2(LOG_STD_LOGGER, 0, CmpLog.LogClass.LOG_INFO, 0, 0, sLogMessage);
	
	// Prepare for next loops
	m_diRowCounter := 0;
	m_liTimestampMin := 16#1FFFFFFFFFFFFFFF;
	m_liTimestampMax := 0;
	
	IF pLabels <> 0 THEN
	    pLabels^ := CONCAT(pLabels^, ']');
	END_IF
END_IF
END_METHOD

METHOD TimestampRead
VAR_INPUT
	(* A 0-based index of the row read from TblTrendData*)
	diWhichRow	: DINT;
	
	(* The absolute timestamp, that was read from TblTrendData*)
	liTimestamp	: LINT;
END_VAR
VAR
	timeDate		: SYSTIMEDATE;
	uiMicroseconds	: UINT;
END_VAR

IF xDetailedOutput THEN
	IF LEN(m_sLine) <> 0 THEN
		VisuElems.Visu_Output_3(DINT_TO_STRING(m_diWhichRow), ': ', m_sLine, 4);
	END_IF
	m_sLine := '';
END_IF

m_diWhichRow := diWhichRow;


IF xDetailedOutput THEN
	// We begin a new line
	m_sLine := LINT_TO_STRING(liTimestamp);

	// Comvert the timestamps in a human readable form
	TrendStorageConvertFromTimestamp(liTimestamp := liTimestamp, timeDate => timeDate, uiMicroseconds => uiMicroseconds);

	// We also append the timestamp in the human readable way
	m_sLine := CONCAT(m_sLine, ';');
	m_sLine := CONCAT(m_sLine, WORD_TO_STRING(timeDate.wYear));
	m_sLine := CONCAT(m_sLine, '-');
	m_sLine := CONCAT(m_sLine, WORD_TO_STRING(timeDate.wMonth));
	m_sLine := CONCAT(m_sLine, '-');
	m_sLine := CONCAT(m_sLine, WORD_TO_STRING(timeDate.wDay));
	m_sLine := CONCAT(m_sLine, ' ');
	m_sLine := CONCAT(m_sLine, WORD_TO_STRING(timeDate.wHour));
	m_sLine := CONCAT(m_sLine, ':');
	m_sLine := CONCAT(m_sLine, WORD_TO_STRING(timeDate.wMinute));
	m_sLine := CONCAT(m_sLine, ':');
	m_sLine := CONCAT(m_sLine, WORD_TO_STRING(timeDate.wSecond));
	m_sLine := CONCAT(m_sLine, ':');
	m_sLine := CONCAT(m_sLine, WORD_TO_STRING(timeDate.wMilliseconds));
	m_sLine := CONCAT(m_sLine, ':');
	m_sLine := CONCAT(m_sLine, UINT_TO_STRING(uiMicroseconds));
ELSE
	m_diRowCounter := m_diRowCounter + 1;
	
	m_liTimestampMax := MAX(m_liTimestampMax, liTimestamp);
	
	(* Append to Label String - Protect against overflow *)
	IF pLabels <> 0 AND LEN(pLabels^) < 1900 THEN
	    TrendStorageConvertFromTimestamp(liTimestamp := liTimestamp, timeDate => timeDate, uiMicroseconds => uiMicroseconds);
	    
	    IF NOT xFirst THEN
	        pLabels^ := CONCAT(pLabels^, ','); // Add comma separator
	    END_IF
	    xFirst := FALSE; 
	    
	    pLabels^ := CONCAT(pLabels^, '"');
	    pLabels^ := CONCAT(pLabels^, WORD_TO_STRING(timeDate.wHour));
	    pLabels^ := CONCAT(pLabels^, ':');
	    pLabels^ := CONCAT(pLabels^, WORD_TO_STRING(timeDate.wMinute));
	    pLabels^ := CONCAT(pLabels^, ':');
	    pLabels^ := CONCAT(pLabels^, WORD_TO_STRING(timeDate.wSecond));
	    pLabels^ := CONCAT(pLabels^, '"');
	END_IF
END_IF
END_METHOD

METHOD ValueRead
VAR_INPUT
	(* A 0-based index of the row read from TblTrendData.*)
	diWhichRow	: DINT;
	(* A 0-based index of the variable within all variables*)
	iWhichVariable	: INT;
	(* The value, that was read from TblTrendData*)
	liValue	: LINT;
	(* Indicates, whether NULL is stored in the trend storage*)
	xValueNULL	: BOOL;
END_VAR
VAR
	sValue		: STRING;
END_VAR

// Debug Capture
diValueReadCalls := diValueReadCalls + 1;
liLastRawValue := liValue;
iLastVarIndex := iWhichVariable;
xLastNull := xValueNULL;

IF xDetailedOutput THEN
	// We simply append the value to the line, that simulates a line of a csv file
	m_sLine := CONCAT(m_sLine, ';');
	
	sValue := m_instValueConverter.ConvertToString(iWhichVariable, liValue, xValueNULL);
	m_sLine := CONCAT(m_sLine, sValue);
ELSE
    IF pAxis <> 0 THEN
        // Debug: Check ALL variables for non-zero data
        IF NOT xValueNULL THEN
             sValue := m_instValueConverter.ConvertToString(iWhichVariable, liValue, xValueNULL);
             IF STRING_TO_REAL(sValue) <> 0 THEN
                 rLastNonZeroValue := STRING_TO_REAL(sValue);
                 iLastNonZeroIndex := iWhichVariable;
             END_IF
        END_IF
        
        IF iWhichVariable = 0 AND NOT xValueNULL THEN
             IF pAxis^.diNumOfData <= 1000 THEN
                // Use converter to handle potential REAL/INT types correctly via string representation
                sValue := m_instValueConverter.ConvertToString(iWhichVariable, liValue, xValueNULL);
                pAxis^.aData[pAxis^.diNumOfData] := STRING_TO_REAL(sValue);
                
                pAxis^.diNumOfData := pAxis^.diNumOfData + 1;
            END_IF       
        END_IF
    END_IF

END_IF
END_METHOD

METHOD VariableConfigurationRead
VAR_INPUT
	paTrendStorageVariableDescription	: POINTER TO ARRAY [0..0] OF VISUTRENDSTORAGEACCESS.TrendStorageVariableDescription;
	iCountVariables	: INT;
END_VAR

m_instValueConverter.SetVariableConfiguration(paTrendStorageVariableDescription, iCountVariables);

// If we previously collected data, we dump it


VisuElems.Visu_Output_3('New configuration having ', INT_TO_STRING(iCountVariables), ' variables', 4);
END_METHOD

END_FUNCTION_BLOCK
