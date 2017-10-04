angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, $rootScope) {

  // instantiate Twilio Programmable Video library
    const Video = Twilio.Video;

    // setup some vars
    var activeRoom;
    var previewTracks;
    var identity;
    var roomName;

    // Attach the Tracks to the DOM.
    function attachTracks(tracks, container) {
        tracks.forEach(function(track) {
            container.appendChild(track.attach());
        });
    }

// Attach the Participant's Tracks to the DOM.
    function attachParticipantTracks(participant, container) {
        var tracks = Array.from(participant.tracks.values());
        attachTracks(tracks, container);
    }

// Detach the Tracks from the DOM.
    function detachTracks(tracks) {
        tracks.forEach(function(track) {
            track.detach().forEach(function(detachedElement) {
                detachedElement.remove();
            });
        });
    }

// Detach the Participant's Tracks from the DOM.
    function detachParticipantTracks(participant) {
        var tracks = Array.from(participant.tracks.values());
        detachTracks(tracks);
    }

    // When we are about to transition away from this page, disconnect
    // from the room, if joined.
    window.addEventListener('beforeunload', leaveRoomIfJoined);

    $rootScope.$on('$stateChangeSuccess',
        function(event, toState, toParams, fromState, fromParams) {
            leaveRoomIfJoined();
        }
    );

      var token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImN0eSI6InR3aWxpby1mcGE7dj0xIn0.eyJqdGkiOiJTS2Q5ZTVmYmU1NjgwZmY2MWIwMjlhNmFhMTNkOGQ4OWRjLTE1MDcwNzkzNjQiLCJpc3MiOiJTS2Q5ZTVmYmU1NjgwZmY2MWIwMjlhNmFhMTNkOGQ4OWRjIiwic3ViIjoiQUM5YWMwYzk1MGUxMWIzNjMzYTE3YjQ1OWZhMzM0NDAwMSIsImV4cCI6MTUwNzA4Mjk2NCwiZ3JhbnRzIjp7ImlkZW50aXR5IjoiYWxpY2UiLCJ2aWRlbyI6eyJyb29tIjoic3VyZ2VyeS1yb29tIn19fQ.erFnf2pwiClVHKHxUKNezb9pzlCjCBcOSJwlS2DiXAw"


        //document.getElementById('room-controls').style.display = 'block';

        // Bind click event and add token to data attribute
        document.getElementById('button-call').addEventListener('click', connect);
        document.getElementById('button-call').setAttribute('data-token', token);

        // Connect
        connect();

        // Bind button to leave Room.
        document.getElementById('button-call-end').onclick = function() {
            log('Disconnecting...');
            document.getElementById('call-connected').style.display = 'none';
            document.getElementById('spin-wrapper').style.display = 'none';
            document.getElementById('button-preview').style.display = 'block';
            document.getElementById('video-overlay').style.display = 'none';
            activeRoom.disconnect();
        };
    

    function connect() {
        roomName = 'Support';

        log("Joining room '" + roomName + "'...");

        token = document.getElementById('button-call').getAttribute('data-token');

        console.log("Token: "+token);

        var connectOptions = {
            name: 'Support',
            logLevel: 'debug'
        };

        if (previewTracks) {
            connectOptions.tracks = previewTracks;
        }

        // Join the Room with the token from the server and the
        // LocalParticipant's Tracks.
        Video.connect(token, connectOptions).then(roomJoined, function(error) {
            log('Could not connect to Twilio: ' + error.message);
        });

        document.getElementById('call-connected').style.display = 'block';
        document.getElementById('spin-wrapper').style.display = 'inline-flex';
        document.getElementById('button-preview').style.display = 'none';
    }

// Successfully connected!
    function roomJoined(room) {
        window.room = activeRoom = room;

        log("Joined as '" + identity + "'");
        document.getElementById('button-call').style.display = 'none';
        document.getElementById('button-call-end').style.display = 'inline';

        // Attach LocalParticipant's Tracks, if not already attached.
        var previewContainer = document.getElementById('local-media');
        if (!previewContainer.querySelector('video')) {
            attachParticipantTracks(room.localParticipant, previewContainer);
        }

        // Attach the Tracks of the Room's Participants.
        room.participants.forEach(function(participant) {
            log("Already in Room: '" + participant.identity + "'");
            var previewContainer = document.getElementById('remote-media');
            attachParticipantTracks(participant, previewContainer);
        });

        // When a Participant joins the Room, log the event.
        room.on('participantConnected', function(participant) {
            //document.getElementById('remote-media').style.display = 'inline';
            log("Joining: '" + participant.identity + "'");
        });

        // When a Participant adds a Track, attach it to the DOM.
        room.on('trackAdded', function(track, participant) {
            log(participant.identity + " added track: " + track.kind);
            var previewContainer = document.getElementById('remote-media');
            document.getElementById('spin-wrapper').style.display = 'none';
            document.getElementById('video-overlay').style.display = 'flex';
            attachTracks([track], previewContainer);
        });

        // When a Participant removes a Track, detach it from the DOM.
        room.on('trackRemoved', function(track, participant) {
            log(participant.identity + " removed track: " + track.kind);
            detachTracks([track]);
        });

        // When a Participant leaves the Room, detach its Tracks.
        room.on('participantDisconnected', function(participant) {
            log("Participant '" + participant.identity + "' left the room");
            detachParticipantTracks(participant);
        });

        // Once the LocalParticipant leaves the room, detach the Tracks
        // of all Participants, including that of the LocalParticipant.
        room.on('disconnected', function() {
            log('Left');
            if (previewTracks) {
                previewTracks.forEach(function(track) {
                    track.stop();
                });
            }
            detachParticipantTracks(room.localParticipant);
            room.participants.forEach(detachParticipantTracks);
            activeRoom = null;
            document.getElementById('button-call').style.display = 'inline';
            document.getElementById('button-call-end').style.display = 'none';
            document.getElementById('spin-wrapper').style.display = 'none';
        });
    }

    // Preview LocalParticipant's Tracks.
    document.getElementById('button-preview').onclick = function() {
        var localTracksPromise = previewTracks
            ? Promise.resolve(previewTracks)
            : Video.createLocalTracks();

        localTracksPromise.then(function(tracks) {
            window.previewTracks = previewTracks = tracks;
            var previewContainer = document.getElementById('local-media');
            if (!previewContainer.querySelector('video')) {
                attachTracks(tracks, previewContainer);
            }
        }, function(error) {
            console.error('Unable to access local media', error);
            log('Unable to access Camera and Microphone');
        });
    };

    document.getElementById('mute').onclick = function() {
        console.dir(room.localParticipant);
        room.localParticipant.audioTracks.disable();
    };

    // Activity log.
    function log(message) {
        console.dir(message);
        return false;
        var logDiv = document.getElementById('log');
        logDiv.innerHTML += '<p>&gt;&nbsp;' + message + '</p>';
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    // Leave Room.
    function leaveRoomIfJoined() {
        if (activeRoom) {
            activeRoom.disconnect();
        }
    }


  // Attach the Participant's Media to a <div> element.
  
})

.controller('ChatsCtrl', function($scope, Chats) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});

//   Twilio.Video.createLocalTracks().then(function(localTracks) {
//     var localMediaContainer = document.getElementById('remote-media-div2');
//     localTracks.forEach(function(track) {
//       localMediaContainer.appendChild(track.attach());
//     });
//   });

//   var token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImN0eSI6InR3aWxpby1mcGE7dj0xIn0.eyJqdGkiOiJTS2Q5ZTVmYmU1NjgwZmY2MWIwMjlhNmFhMTNkOGQ4OWRjLTE1MDcwNzA2MzIiLCJpc3MiOiJTS2Q5ZTVmYmU1NjgwZmY2MWIwMjlhNmFhMTNkOGQ4OWRjIiwic3ViIjoiQUM5YWMwYzk1MGUxMWIzNjMzYTE3YjQ1OWZhMzM0NDAwMSIsImV4cCI6MTUwNzA3NDIzMiwiZ3JhbnRzIjp7ImlkZW50aXR5IjoiZG9jdG9yIiwidmlkZW8iOnsicm9vbSI6InN1cmdlcnktcm9vbSJ9fX0.NcEFYhvMmXqdiJMVef_L_IpZQgttVgJDm4hb0NxDGLs"

//   Twilio.Video.connect('token', {name:'surgery'}).then(function(room) {
//   console.log('Successfully joined a Room: ', room);
//   room.on('participantConnected', function(participant) {
//     console.log('A remote Participant connected: ', participant);
//   })
// }, function(error) {
//     console.error('Unable to connect to Room: ' +  error.message);
// });

  var token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImN0eSI6InR3aWxpby1mcGE7dj0xIn0.eyJqdGkiOiJTS2Q5ZTVmYmU1NjgwZmY2MWIwMjlhNmFhMTNkOGQ4OWRjLTE1MDcwNzI4NzMiLCJpc3MiOiJTS2Q5ZTVmYmU1NjgwZmY2MWIwMjlhNmFhMTNkOGQ4OWRjIiwic3ViIjoiQUM5YWMwYzk1MGUxMWIzNjMzYTE3YjQ1OWZhMzM0NDAwMSIsImV4cCI6MTUwNzA3NjQ3MywiZ3JhbnRzIjp7ImlkZW50aXR5Ijoic3VyZ2VyeSIsInZpZGVvIjp7InJvb20iOiJzdXJnZXJ5LXJvb20ifX19.CNvk1Urd8wH6190_My7EHS5BzLQR0Q6wVL458OffkP4"


Twilio.Video.connect(token, { name: 'room-name' }).then(room => {
  console.log('Connected to Room "%s"', room.name);

  room.participants.forEach(participantConnected);
  room.on('participantConnected', participantConnected);

  room.on('participantDisconnected', participantDisconnected);
  room.once('disconnected', error => room.participants.forEach(participantDisconnected));
});

function participantConnected(participant) {
  console.log('Participant "%s" connected', participant.identity);

  var div = document.getElementById('remote-media-div2');
  div.id = participant.sid;
  div.innerText = participant.identity;

  participant.on('trackSubscribed', track => trackAdded(div, track));
  participant.tracks.forEach(track => trackAdded(div, track));
  participant.on('trackUnsubscribed', trackRemoved);

  document.body.appendChild(div);
}

function participantDisconnected(participant) {
  console.log('Participant "%s" disconnected', participant.identity);

  participant.tracks.forEach(trackRemoved);
  document.getElementById(participant.sid).remove();
}

function trackAdded(div, track) {
  div.appendChild(track.attach());
}

function trackRemoved(track) {
  track.detach().forEach(element => element.remove());
}

  console.log("byeee");
  $scope.chats = Chats.all();
  $scope.remove = function(chat) {
    Chats.remove(chat);
  };
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
