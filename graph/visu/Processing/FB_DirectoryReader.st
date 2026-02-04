FUNCTION_BLOCK FB_DirectoryReader
VAR_INPUT
    xExecute : BOOL;                    // Rising edge triggers directory read
    sDirectoryPath : STRING(255);       // Path to directory to read
END_VAR

VAR_OUTPUT
    xDone : BOOL;                       // TRUE when reading is complete
    xBusy : BOOL;                       // TRUE while reading is in progress
    xError : BOOL;                      // TRUE if an error occurred
    eErrorID : RTS_IEC_RESULT;         // Error code if xError is TRUE
    udiFileCount : UDINT;              // Number of files found
    aFileList : ARRAY[0..99] OF STRING(255);  // List of file names found
END_VAR

VAR
    // Internal state machine
    eState : (IDLE, OPEN_DIR, READ_ENTRIES, CLOSE_DIR, DONE, ERROR);
    xExecuteOld : BOOL;

    // SysDir function blocks and variables
    hDir : RTS_IEC_HANDLE;             // Directory handle
    sDirEntry : STRING(255);           // Current directory entry name
    dirInfo : DirInfo;                 // Directory information structure
    result : RTS_IEC_RESULT;           // Result code

    // Internal index
    udiIndex : UDINT;                  // Current index in file list
END_VAR

VAR CONSTANT
    INVALID_HANDLE : RTS_IEC_HANDLE := 16#FFFFFFFF;
END_VAR

// Implementation
// Detect rising edge on xExecute
IF xExecute AND NOT xExecuteOld THEN
    eState := OPEN_DIR;
    xDone := FALSE;
    xBusy := TRUE;
    xError := FALSE;
    eErrorID := 0;
    udiFileCount := 0;
    udiIndex := 0;
END_IF
xExecuteOld := xExecute;

CASE eState OF
    IDLE:
        xBusy := FALSE;
        xDone := FALSE;

    OPEN_DIR:
        // Open the directory
        hDir := SysDirOpen(
            szDir := sDirectoryPath,
            szDirEntry := sDirEntry,
            diMaxDirEntry := SIZEOF(sDirEntry),
            pDirInfo := ADR(dirInfo),
            pResult := ADR(result)
        );

        IF hDir <> INVALID_HANDLE THEN
            // Directory opened successfully
            eState := READ_ENTRIES;
        ELSE
            // Failed to open directory
            xError := TRUE;
            eErrorID := result;
            eState := ERROR;
        END_IF

    READ_ENTRIES:
        // Read next directory entry
        result := SysDirRead(
            hDir := hDir,
            szDirEntry := sDirEntry,
            diMaxDirEntry := SIZEOF(sDirEntry),
            pDirInfo := ADR(dirInfo)
        );

        IF result = 0 THEN  // ERR_OK
            // Successfully read an entry
            // Check if it's a file (not a directory)
            IF dirInfo.diDirectory = 0 THEN  // Not a directory
                // Store file name in array if space available
                IF udiIndex < 100 THEN
                    aFileList[udiIndex] := sDirEntry;
                    udiIndex := udiIndex + 1;
                    udiFileCount := udiFileCount + 1;
                END_IF
            END_IF
            // Continue reading next entry

        ELSIF result = 16#00000002 THEN  // ERR_END_OF_DIR
            // Reached end of directory
            eState := CLOSE_DIR;

        ELSE
            // Error reading directory
            xError := TRUE;
            eErrorID := result;
            eState := CLOSE_DIR;  // Still try to close the directory
        END_IF

    CLOSE_DIR:
        // Close the directory handle
        result := SysDirClose(hDir := hDir);

        IF xError THEN
            eState := ERROR;
        ELSE
            eState := DONE;
        END_IF

    DONE:
        xBusy := FALSE;
        xDone := TRUE;
        eState := IDLE;

    ERROR:
        xBusy := FALSE;
        xDone := TRUE;
        eState := IDLE;
END_CASE
