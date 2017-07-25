/* Placement Quiz */
/* ALB 6-4-2017 */
/* Publish to GitHub - 7-8-2017 */
/* Sanitized - 7-25-17 */

function doGet(e) {

  return HtmlService.createTemplateFromFile('quizform.html')
                    .evaluate()
                    .setTitle("Placement Test")
                    .setFaviconUrl("https://bbk12e1-cdn.myschoolcdn.com/ftpimages/30/logo/NEWfavicon.ico");
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
       .getContent();
}

/*************************************************************************/
/*          RETURN MASTER SPREADSHEET GOOGLE FILE ID                     */
/*************************************************************************/
function getMasterSheet(testname) {
  
/*************************************************************************/
/*************************************************************************/
/**                                                                     **/
/**               ONLY MODIFY THIS WITH THE ID OF THIS FILE WHICH       **/
/**               YOU WILL NEED TO DO IF YOU MADE A COPY OF THE FILE    **/
/**                                                                     **/
  var mFID = "<Google FID Here>";
/**                                                                     **/
/**                                                                     **/
/**                                                                     **/
/*************************************************************************/
/*************************************************************************/
  
  var ss = SpreadsheetApp.openById(mFID);
  var sheetObject = ss.getSheetByName(testname);
  
  return sheetObject;
}

/*************************************************************************/
/*      RETURN START ROW OF UNLIMITED LIST ITEMS IN MASTER SHEET         */
/*      Change the Number Returned If you Change the Spreadsheet         */
/*       This Function Eliminates the Use of a Global Variable           */
/*    (Yes I know All Functions are Still In The Global Name Space)      */
/*************************************************************************/
function getStartRow() {
  return(5);
}

/*************************************************************************/
/*              RETURN LOGO FILE ID AND CURRENT SYSTEM VERSION           */
/*************************************************************************/
function initTestForm() {
  
  var ret = { status: "OK",
             result: "",
             logoFID: "",
             version: "0.50"};
             
  var ts = getMasterSheet("SETTINGS");
  var fid = ts.getRange(2, 2).getValue(); /* Logo Google File ID */
             
  if (fid != null && fid != "") {
    ret.logoFID = fid;
  } else {
    ret.status = "ERROR";
    ret.result = "Logo FID Not Found."; 
    ret.logoFID = "";
  }
  
  return ret;
}

/*************************************************************************/
/*   RETURN TEST INITIALIZATION CELL DATA OBJECT FROM MASTER SHEET       */
/*************************************************************************/
function initTestItems(e) {
  
  var ts = getMasterSheet(e.test);

  var ret = { status: "OK",
              result: "",
              user: "",
              title: "",
              pages: "",
              time: "",
              started: "",
              testInst: "",
              dLname: "",
              dLurl: "",
              quesTxts: [],
              quesImgs: [],
              quesData: [],
              ansrTyps: [],
              ansrImgs: [],
              ansrTxts: [] };

  /* Local Result Object Error String Setting Function */
  var setErr = function(str) {
        ret.status = "ERROR";
        if (ret.result.length) {
          ret.result = ret.result + "\n";
        }
        ret.result = ret.result + str;
      };

  if (ts == null) {
    setErr("No Test Named '" + e.test + "' Found.");
    return ret;
  }

  var emDomain = ts.getRange(3, 2).getValue(); /* Email Domain */
  var userEmail = Session.getActiveUser().getEmail(); /* Google Domain Active User Email ID */
  ret.time = ts.getRange(3, 6).getValue(); /* Test Time Limit */
  
  var startRow = getStartRow();
  var lastRow = ts.getLastRow();
  var usr = "";
  
  /* Get and Authenticate User, Test Name, Test Code, and Test Status */
  for (var i = startRow; i <= lastRow; i++) {
    usr = ts.getRange(i, 1).getValue();
    //Logger.log("Checking Usr: " + usr + " vs " + e.email + " Google User: " + userEmail);
    //ret.result = "Checking Usr: " + usr + " vs " + e.email + " Google User: " + userEmail;
    if (usr + emDomain == e.email) { // Put this back in -> (&& usr + emDomain == userEmail)
      // Put this in to check google domain user
      //if (usr + emDomain != userEmail) {
      //  setErr("Email '" + e.email + "' is not Authorized for Access in Google Apps Domain '" + emDomain + "'.");
      //}
      if (ts.getRange(i, 2).getValue() != e.code) {
        setErr("Invalid Test Code for Test '" + e.test + "' by Student '" + e.email + ".");
      }
      var stdt = new Date();
      var tclosed = ts.getRange(i, 3).getValue().toString();
      //Logger.log("CLOSED FIELD: " + tclosed);
      if ( tclosed == "") {
        var mm = stdt.getMonth() + 1;
        var dd = stdt.getDate();
        var yyyy = stdt.getFullYear();
        var h = stdt.getHours();
        var m = stdt.getMinutes();
        var s = stdt.getSeconds();
        ret.started = mm + "/" + dd + "/" + yyyy + " " + h + ":" + m + ":" + s;
        ts.getRange(i, 3).setValue(ret.started);
        SpreadsheetApp.flush();
      } else {
        if ( tclosed != "Y" ) {
          ret.started = tclosed;
          if (ts.getRange(3, 8).getValue() == "Yes" ) {
            var chkNow = stdt.getTime();
            var chkd = new Date(tclosed);
            var chkClsd = chkd.getTime();
            if ( chkNow - chkClsd < (ret.time * 60000) ) {
              //Logger.log("Test Time Expired.");
              setErr("\n" + "Test '" + e.test + "' for Student '" + e.email + "' Time Has Expired.");
            }
          }
          //Logger.log("USER AUTHORIZED: " + usr);
        } else {
          setErr("\n" + "Test '" + e.test + "' for Student '" + e.email + "' is Closed.");
        }
      }
      if (ret.status == "OK") {
        /* Set Authenticated User */
        ret.user = usr;
      }
      break;
    }
    //Logger.log("'i' is: " + i + " User is: " + ret.user + "Status is: " + ret.status + " - " + ret.result);
    /* Break if Cell is Blank */
    if (usr == "") {
      i = lastRow;
      break;
    }
  }
  
  
  if (i >= lastRow && ret.user == "") {
    setErr("No Student with Email '" + e.email + "' is Registered for Test '" + e.test + "'.");
  }
  if (ret.status != "OK") {
    return ret;
  }
  
  ret.title = ts.getRange(2, 1).getValue();
  ret.testInst = ts.getRange(2, 8).getValue();
  ret.dLname = ts.getRange(1, 8).getValue();
  ret.dLurl = ts.getRange(1, 9).getValue();
  //Logger.log("Getting Questions and Answers...");

  /* Get Target Test User Folder on System Owner's Google Drive */
  var fpath = ts.getRange(2, 6).getValue();
  var usrFiles, tFolder = getTargetFolder(fpath, e.test, ret.user);
  
  var uf, ufid, ufname, afname;
  var page = "", type = "";
  var anum = "";
  var idx = 0;
  
  if (typeof tFolder == "string") {
    setErr("Error Traversing Directories: " + tFolder);
    return ret;
  }
  
  /* Iterate Through The Master Sheet Test Page Numbers Column And Load Test Data */
  try {
  /* MAIN DATA LOOP */
  for (var i = startRow; i <= lastRow; i++) {
    
    //Logger.log("Get Row: " + i + " Last Row: " + lastRow);
    /* Exit loop if Test Page Number is Blank */
    if (ts.getRange(i, 4).getValue() == "") {
      i = lastRow;
      break;
    }
    /* Load Test Page Data and Parameters */
    ret.quesTxts.push(ts.getRange(i, 5).getValue()); /* Question Text */
    ret.quesImgs.push(ts.getRange(i, 6).getValue()); /* Question Image File ID */
    ret.ansrTyps.push(ts.getRange(i, 7).getValue()); /* Answer Type */
    ret.quesData.push(ts.getRange(i, 8).getValue()); /* Answer Type Parameters */
    
    page = ts.getRange(i, 4).getValue(); /* Current Page Number */
    idx = Number(page) - 1;     /* Current Page Converted to Array Index */
    if (page < 10) {
      anum = "0" + page;
    } else {
      anum = page;
    }
    type = ret.ansrTyps[idx];   /* Set Current Answer Type */
    
    //Logger.log("Loaded Sheet Master TEST DATA for Page: " + page + " Type: " + type);
    /* Get Answer File ID From User Folder If One Exists for Current Page */
    usrFiles = tFolder.getFiles();
    ufid = "";
    while (usrFiles.hasNext()) {
      uf = usrFiles.next();
      ufname = uf.getName();
      if (ufname.split(".")[0] == "Answer-" + anum || ufname.split(".")[0] == "Answer-" + page) {
        ufid = uf.getId();
        //Logger.log("Found Answer File: " + uf.name);
        break;
      }
    }
    /* ALLOCATE ARRAY LOCATION EVEN IF NO ANSWER FILE EXISTS TO PRESERVE INDEX POSITION */
    ret.ansrImgs.push("");
    ret.ansrTxts.push("");
    
    /* Get File ID of Image File, or Text Data from Text File for Return Object Array */
    if (ufid != null && ufid != "") {
      //Logger.log("Ans File - Id: " + ufid + " Name: " + ufname + " Type: " + type + " Page: " + page);
      if (type == "Image") {
        ufid = uf.getId();
        //Logger.log("Ans Image File Name: " + ufname + " FID: " + ufid);
        ret.ansrImgs[idx] = ufid;
      } else if (type == "Para Text" || type == "Short Text" || type == "Multi Choice") {
          var data = uf.getAs("text/plain").getDataAsString();
          //Logger.log("Ans Text File Name: " + ufname + " Data: " + data);
          ret.ansrTxts[idx] = data;
      }
    }
  } /* END MAIN DATA LOOP */
  } /* END TRY */
  
  catch(err) {
    setErr("Error Loading Answer Files: " + err);
  }
  
  finally {
    //Logger.log("Pages Loaded: " + page);
    /* Set Pages Found and Return Data Object */
    if (page == "") {
      setErr("No Pages For Test '" + e.test + "'Found To Load.");
    } else {
      ret.pages = page;
    }
    return ret;
  }
}

/*************************************************************************/
/*   UPLOAD NEW OR OVERWRITE EXISTING SUBMITTED ANSWER FILE              */
/*************************************************************************/
function uploadFileToGoogleDrive(data, file, type, test, user, page) {
  
  var ts = getMasterSheet(test);
  
  var fpath = ts.getRange(2, 6).getValue();
  var tFolder = getTargetFolder(fpath, test, user); /* Get Path to User Folder */

  if (typeof tFolder == "string") {
    setErr("Error Traversing Directories: " + tFolder);
    return ret;
  }
  
  var newfl = "";
  var anum = "";
  var contentType;
  var bytes;
  var blob;
  
  if (page < 10) {
    anum = "0" + page;
  } else {
    anum = page;
  }
  
  try {
  
    if (type == "Image") {
      /* Create New Image File from Passed Data Blob */
      newfl = "Answer-" + anum + "." + file.split(".").splice(-1);
      contentType = data.substring(5,data.indexOf(';'));
      bytes = Utilities.base64Decode(data.substr(data.indexOf('base64,')+7));
      blob = Utilities.newBlob(bytes, contentType, newfl);
    } else if (type == "Para Text" || type == "Short Text" || type == "Multi Choice") {
      newfl = "Answer-" + anum + ".txt";
    } else if (type != "None") {
        return "ERROR: Invalid Answer Type to Upload.";
    }
    
    var usrFile = "", usrFiles = tFolder.getFiles();
    if (typeof tFolder == "string") {
      return "ERROR: Problem Traversing Directories: " + tFolder;
    }
    
    while (usrFiles.hasNext()) {
      var xfile = usrFiles.next();
      var xname = xfile.getName();
      if (xname.split(".")[0] == newfl.split(".")[0]) {
        if (type == "Image") {
          /* Delete Old Image File So New One Can Be Saved */
          usrFile = xfile.setTrashed(true);
          usrFile = "" /* Force Blank to Make a New File */
        } else if (type == "Para Text" || type == "Short Text" || type == "Multi Choice") {
            /* Over Write Old Text File Content */
            usrFile = xfile.setContent(data);
        }
        break;
      }
    }
    if (type == "Image") {
      /* Create New Image File */
      usrFile = tFolder.createFile(blob);
      return usrFile.getId();
    } else if (type == "Para Text" || type == "Short Text" || type == "Multi Choice") {
        if (usrFile == "") {
          /* Create New Text File */
          usrFile = tFolder.createFile(newfl, data, MimeType.PLAIN_TEXT);
        }
        return "DATA: " + data;
    }
    Logger.log("ERROR: Cannot Create File for Unknown File Type.");
    return "ERROR: Cannot Create File for Unknown File Type.";
 
  } catch(f) {
    Logger.log("ERROR:" + f.toString());
    return "ERROR:" + f.toString();
  }
}

/*************************************************************************/
/*   CLOSE TEST IN MASTER SHEET AND SEND RESULTS EMAIL TO INSTRUCTOR     */
/*************************************************************************/
function closeTestSession(ud) {
  
  //Logger.log("Closing Test: " + ud.test + " for " + ud.user);
  var ts = getMasterSheet(ud.test);
  
  try {
   
    var email = ts.getRange(3, 1).getValue(); /* Teacher Email Address */
    var emDomain = ts.getRange(3, 2).getValue(); /* Email Domain */
    var fpath = ts.getRange(2, 6).getValue();
    var tFolder = getTargetFolder(fpath, ud.test, ud.user); /* Get Path to User Folder */
    if (typeof tFolder == "string") {
      return("Error Traversing Directories: " + tFolder);
    }
    
    var usrFiles; /* = tFolder.getFiles(); */
    var usrFile = "";
    var newfl = "";
    var anum = "";
    var xURL = "";
    
    var sDate = new Date(ud.startTime);
    var eDate = new Date();
    var mins = Math.floor(((eDate.getTime() - sDate.getTime()) / 60000) % 60);
    
    /* Create Text Data for Email to Instructor and Create Log File */
    var qImg = "";
    var qTxt = "";
    var data = "****************************** DATA FOR TEST [" + ud.test + "] *******************************\n";
    data += "NAME: " + ud.user + " TEST TIME: " + ud.maxTime + " MIN.\n";
    data += "START: " + sDate.toString() + " END: " + eDate.toString() + "\nELAPSED TIME: " + mins + " Minutes.\n\n";
    data += "- - - - - - - - - - - - - - ANSWERS - - - - - - - - - - - - - - - - -\n";
    var lpg = Number(ud.lastPg);
    for (var i = 0; i < lpg; i++) {
      if (i < 9) {
        anum = "0" + (i+1);
      } else {
        anum = (i+1);
      }
      //Logger.log("PROCESSING DATA PAGE: " + anum + " OF " + lpg);
      data += "\nANSWER #" + (i+1) + ": ";
      if (ud.ansTyps[i] == "Image") {
        /* Fetch File URL */
        xURL = "";
        newfl = 'title contains "Answer-' + anum + '."';
        //Logger.log("SEARCHING FOR: " + newfl);
        usrFiles = tFolder.searchFiles(newfl);
        while (usrFiles.hasNext()) {
          var xfile = usrFiles.next();
          if (xfile) {
            //Logger.log("GETTING NEW FILE URL...");
            xURL = xfile.getUrl();
            data += "[ " + xURL + " ]\n";
            break;
          }
        }
        if (xURL == "" && i < 9) {
          /* NOT FOUND WITH LEADING ZERO - LOOK FOR NON LEADING ZERO */
          xURL = "";
          newfl = 'title contains "Answer-' + (i+1) + '."';
          //Logger.log("SEARCHING FOR: " + newfl);
          usrFiles = tFolder.searchFiles(newfl);
          while (usrFiles.hasNext()) {
            var xfile = usrFiles.next();
            if (xfile) {
              //Logger.log("GETTING OLD FILE URL...");
              xURL = xfile.getUrl();
              data += "[ " + xURL + " ]\n";
              break;
            }
          }
        }
        if (xURL == "") {
          data += "[ ***** FILE or FILE URL NOT FOUND ***** ]\n";
        }
      } else {
        data += ud.ansTxts[i] + "\n";
      }
      /* data += "STATUS: " + ud.ansStat[i] + "\n"; */
    }
    data += "\n***************** END OF TEST ********************";
    
    usrFile = "";
    usrFiles = tFolder.searchFiles('title contains "TestLog.txt"');
    while (usrFiles.hasNext()) {
      var xfile = usrFiles.next();
      if (xfile) {
        usrFile = xfile.setContent(data);
        break;
      }
    }
    if (usrFile == "") {
      /* Save Test Results Data as Text Log File */
      /* Use the line below for creating a PDF file: */
      /* DriveApp.createFile(Utilities.newBlob(data, MimeType.HTML).getAs(MimeType.PDF).setName('TestLog.pdf')); */
      usrFile = tFolder.createFile("TestLog.txt", data, MimeType.PLAIN_TEXT);
    }
    if (email != "") {
      /* Send Results Email to Designated Instructor Recipient */
      MailApp.sendEmail({
          to: email + emDomain,
          noReply: true,
          subject: "PLACEMENT TEST [" + ud.test + "] RESULTS FOR: " + ud.user,
          body: data
      });
    }
    //Logger.log("UPDATED / CREATED STATUS DATA FILE / SENT EMAIL");
    /* Set Closed Flag to 'Y' in Master Sheet */
    var closed = false;
    var startRow = getStartRow();
    var lastRow = ts.getLastRow();
    var usr = "";
    for (var i = startRow; i < lastRow; i++) {
      usr = ts.getRange(i, 1).getValue();
      if (usr == ud.user) {
        ts.getRange(i, 3).setValue("Y");
        SpreadsheetApp.flush();
        closed = true;
        break;
      }
      if (usr == "") {
        i = lastRow;
        break;
      }
    }
    //Logger.log("USER STATUS FILE UPDATED.");
    if (closed == false) {
      return("No Student with Email '" + ud.user + "@domain.org" + "' is Authorized for Test '" + ud.test + "'.");
    }
    
    //Logger.log("UPDATE - COMPLETE.");
    
    return "OK";
    
  } catch(e) {
    return("ERROR: " + e);
  }
}

/*************************************************************************/
/*   RETURN SYSTEM OWNER'S GOOGLE DRIVE FOLDER FOR TARGET TEST USER      */
/* NOTE: This Function will Create Path Folders If They Do Not Yet Exist */
/*************************************************************************/
function getTargetFolder(targetPath, test, user) {
  
  if (targetPath == null) { // Trap null
    targetPath == "";
  }
  var pathfolders = targetPath.split(">"); // Get Path Folders
  //Logger.log("Checking Path: " + pathfolders + "\nTest: " + test + "\nUser: " + user);
  if (pathfolders[0] == "My Drive" || pathfolders[0] == "MyDrive") {
    pathfolders.shift(); // Remove "My Drive" Root Folder
  }
  
  try {
    
    var folder, folders;
    var tstFolder, tstFolders;
    if (pathfolders != null && pathfolders.length) {
      for (var i = 0; i < pathfolders.length; i++) { /* Loop Through Folders */
        //Logger.log("Checking Folder: " + pathfolders[i]);
        if (i == 0) { /* Check for Folder in Root */
          folders = DriveApp.getFoldersByName(pathfolders[i]);
        } else {
          folders = folder.getFoldersByName(pathfolders[i]);
        }
        if (folders.hasNext()) {
          folder = folders.next();
        } else if (i == 0) { /* Create Folder in Root */
            //Logger.log("Creating Folder: " + pathfolders[i]);
            folder = DriveApp.createFolder(pathfolders[i]);
        } else {
            folder = folder.createFolder(pathfolders[i]);
        }
      }
      tstFolders = folder.getFoldersByName(test);
    } else { /* No Folder Path Specified in Spreadsheet Cell, Create Folder in Root */
      tstFolders = DriveApp.getFoldersByName(test);
    }
    //Logger.log("Checking Test Folder: " + test + "...");
    if (tstFolders.hasNext()) {
      tstFolder = tstFolders.next();
    } else {
      //Logger.log("Creating Test Folder: " + test + "...");
      tstFolder = folder.createFolder(test);
      tstFolder.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    }
    
    //Logger.log("Checking User Folder: " + user + "...");
    var usrFolder, usrFolders = tstFolder.getFoldersByName(user);
    if (usrFolders.hasNext()) {
      usrFolder = usrFolders.next();
    } else {
      //Logger.log("Creating User Folder: " + user + "...");
      usrFolder = tstFolder.createFolder(user);
    }
    
    return usrFolder;
    
  } catch (f) {
      Logger.log("Got Error:\n" + f.toString());
      return("ERROR: " + f.toString());
  }

}

/***************************************************************************/
/* FUNCTION CALLED FROM CLIENT TO DELAY SYSTEM TO DISPLAY TEXTAREA UPDATE  */
/* Perform TextArea Size Update In The Callback Function For This Functio  */
/***************************************************************************/
function clientDelay(ms) {
  if (ms > 0) {
    Utilities.sleep(ms);
  }
  return(ms);
}

