FUNCTION_BLOCK FB_ReadCSV
VAR_INPUT
    xExecute : BOOL;
    sFileName : STRING(255);
END_VAR
VAR_OUTPUT
    xDone : BOOL;
    xBusy : BOOL;
    xError : BOOL;
    dwErrorID : RTS_IEC_RESULT;
    aFileLines : ARRAY[0..99] OF STRING(255);
    udiLineCount : UDINT;
END_VAR
VAR
    iState : INT := 0;
    xExecuteOld : BOOL;
    hFile : RTS_IEC_HANDLE := RTS_INVALID_HANDLE;
    sBaseDir : STRING(255) := '/home/codesys/';
    sFullPath : STRING(255);
    
    // Reading buffers
    byReadChar : BYTE;
    sCurrentLine : STRING(255);
    ulBytesRead : UDINT;
    iLineIndex : INT;
    
    // Helpers
    pDest : POINTER TO BYTE;
    byNull : BYTE := 0;
END_VAR
VAR CONSTANT
    RTS_INVALID_HANDLE : RTS_IEC_HANDLE := 16#FFFFFFFF;
END_VAR

// Edge detection
IF xExecute AND NOT xExecuteOld THEN
    xDone := FALSE;
    xBusy := TRUE;
    xError := FALSE;
    dwErrorID := 0;
    udiLineCount := 0;
    iState := 10;
    
    // Clear previous results
    FOR iLineIndex := 0 TO 99 DO
        aFileLines[iLineIndex] := '';
    END_FOR
END_IF
xExecuteOld := xExecute;

// State machine
CASE iState OF
    10: // Open File
        // Construct full path
        sFullPath := CONCAT(sBaseDir, sFileName);
        
        // Open in Read mode
        hFile := SysFileOpen(szFile := sFullPath, am := ACCESS_MODE.AM_READ, pResult := ADR(dwErrorID));
        
        IF hFile <> RTS_INVALID_HANDLE THEN
            iState := 20;
            sCurrentLine := '';
            udiLineCount := 0;
        ELSE
            xError := TRUE;
            xBusy := FALSE;
            iState := 0;
        END_IF

    20: // Read Loop
        // Read 1 byte
        ulBytesRead := SysFileRead(
            hFile := hFile, 
            pbyBuffer := ADR(byReadChar), 
            ulSize := 1, 
            pResult := ADR(dwErrorID)
        );
        
        IF ulBytesRead = 0 THEN
            // EOF reached
            // Save last line if not empty
            IF LEN(sCurrentLine) > 0 AND udiLineCount < 100 THEN
                aFileLines[udiLineCount] := sCurrentLine;
                udiLineCount := udiLineCount + 1;
            END_IF
            iState := 30; // Close file
        
        ELSE
            // Process character
            IF byReadChar = 16#0A THEN // LF (Line Feed)
                // End of line found
                // Note: CR (16#0D) might be present at end of string, we can trim it or just leave it depending on usage.
                
                // Remove CR if previous char was CR (simple check: if last char of sCurrentLine is $R)
                // Actually easier: just ignore CR when building string, OR handle LF as terminator.
                
                IF udiLineCount < 100 THEN
                    aFileLines[udiLineCount] := sCurrentLine;
                    udiLineCount := udiLineCount + 1;
                END_IF
                sCurrentLine := ''; // Reset buffer
                
            ELSIF byReadChar = 16#0D THEN // CR (Carriage Return)
                // Ignore CR, wait for LF
                ;
            ELSE
                // Append character
                // Safety check for max length
                IF LEN(sCurrentLine) < 255 THEN
                    // Calculate append position
                    pDest := ADR(sCurrentLine) + LEN(sCurrentLine);
                    
                    // Copy character
                    SysMemCpy(
                        pDest := pDest,
                        pSrc := ADR(byReadChar),
                        udiCount := 1
                    );
                    
                    // Null terminate next byte
                    SysMemCpy(
                        pDest := pDest + 1,
                        pSrc := ADR(byNull),
                        udiCount := 1
                    );
                END_IF
            END_IF
        END_IF

    30: // Close File
        SysFileClose(hFile := hFile);
        hFile := RTS_INVALID_HANDLE;
        
        IF NOT xError THEN
            xDone := TRUE;
        END_IF
        xBusy := FALSE;
        iState := 0;

END_CASE
