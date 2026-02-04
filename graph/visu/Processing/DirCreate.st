FUNCTION DirCreate : BOOL
VAR_INPUT
    sDirectoryPath : STRING(255);   // Full path of directory to create
END_VAR
VAR
    result : RTS_IEC_RESULT;        // Result code
END_VAR

// Create the directory
result := SysDirCreate(
    szDir := sDirectoryPath,
    pResult := ADR(result)
);

// Return TRUE if directory was created successfully
IF result = 0 THEN  // ERR_OK
    DirCreate := TRUE;
ELSE
    DirCreate := FALSE;
END_IF
