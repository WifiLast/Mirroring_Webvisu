FUNCTION FileExist : BOOL
VAR_INPUT
    sFilePath : STRING(255);    // Full path to the file to check
END_VAR
VAR
    hFile : RTS_IEC_HANDLE;     // File handle
    result : RTS_IEC_RESULT;    // Result code
END_VAR
VAR CONSTANT
    INVALID_HANDLE : RTS_IEC_HANDLE := 16#FFFFFFFF;
END_VAR

// Try to open the file in read mode
hFile := SysFileOpen(
    szFile := sFilePath,
    am := ACCESS_MODE.AM_READ,
    pResult := ADR(result)
);

// Check if file was opened successfully
IF hFile <> INVALID_HANDLE THEN
    // File exists, close it
    SysFileClose(hFile := hFile);
    FileExist := TRUE;
ELSE
    // File does not exist or cannot be opened
    FileExist := FALSE;
END_IF
