FUNCTION FileCopy : BOOL
VAR_INPUT
    sSourceFile : STRING(255);      // Full path to source file
    sDestDirectory : STRING(255);   // Destination directory path
    sDestFileName : STRING(255);    // Destination file name
END_VAR
VAR
    sDestPath : STRING(255);        // Complete destination path
    result : RTS_IEC_RESULT;        // Result code
END_VAR

// Build complete destination path
sDestPath := CONCAT(sDestDirectory, '\');
sDestPath := CONCAT(sDestPath, sDestFileName);

// Copy the file
result := SysFileCopy(
    szFileDest := sDestPath,
    szFileSource := sSourceFile,
    pResult := ADR(result)
);

// Return TRUE if copy was successful
IF result = 0 THEN  // ERR_OK
    FileCopy := TRUE;
ELSE
    FileCopy := FALSE;
END_IF
