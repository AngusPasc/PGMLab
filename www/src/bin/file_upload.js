// the URL of the WAMP Router (Crossbar.io) This code was originally inspired from https://github.com/crossbario/crossbarexamples/blob/master/fileupload/index.html
//
var wsuri;
if (document.location.origin === "null" || document.location.origin === "file://") {
   wsuri = "ws://127.0.0.1:8080/ws";
} else {
   wsuri = (document.location.protocol === "http:" ? "ws:" : "wss:") + "//" +
               document.location.host + "/ws";
}
var connection = new autobahn.Connection({
   url: wsuri,
   realm: 'realm1'
});
connection.onopen = function (session, details) {
   console.log("Connected", details);
   session.subscribe('com.example.upload.on_progress', function (args) {
      var pinfo = args[0];
      console.log('upload event received', pinfo.status, pinfo.chunk, pinfo.remaining, pinfo.total, pinfo.progress);
   });
   var r = new Resumable({
      target: 'upload',
      chunkSize: 1 * 1024 * 1024,
      forceChunkSize: true, // https://github.com/23/resumable.js/issues/51
      simultaneousUploads: 4,
      testChunks: true,
      query: {
         on_progress: 'com.example.upload.on_progress',
         session: session.id
      }
   });
   if (!r.support) {
      console.log("Fatal: ResumableJS not supported!");
   } else {
      r.assignBrowse(document.getElementById('browseButton'));
      r.assignDrop(document.getElementById('dropFiles'));
      r.on('fileAdded', function (file) {
         console.log('fileAdded', file);
         r.upload();
      });
      r.on('fileSuccess', function (file, message) {
         console.log('fileSuccess', file, message);
         console.log(r.files);
         // enable repeated upload since other user can delete the file on the server
         // and this user might want to reupload the file
         file.cancel();
      });
      r.on('fileError', function (file, message) {
         console.log('fileError', file, message);
      });
   }
};
connection.open();
