| Code | Purpose / Meaning       | Action Taken                                                                                  |
|------|------------------------|------------------------------------------------------------------------------------------------|
| 90   | Seek start             | A user started seeking the video; other clients update `video.currentTime` to match.          |
| 91   | Seek end               | A user finished seeking; reset `isSeeking` and `originalSeek`.                                 |
| 96   | Set my IP              | Server sends your own IP to the client.                                                        |
| 97   | Rejoin – set time      | Used when a user joins late; sets video time to sync with others.                               |
| 98   | Send my current time   | Requests other clients to send their current video time (used for late joiners).               |
| 109  | User left              | A user left the room; remove from `members` and `readyMembers`, update UI, pause video if needed. |
| 198  | Load ready members     | Loads ready members list from another client.                                                  |
| 199  | Request ready members  | A client asks others to send the ready members list.                                           |
| 200  | New user joined        | A new client joined; updates active members list, shows popup, pauses video.                   |
| 201  | Sync time check        | Regular time check for video sync; if gap > 0.5s, request correction.                          |
| 202  | Force change time      | Used to forcibly change the video time to a synced value.                                      |
| 205  | Pause video            | Command to pause the video.                                                                    |
| 206  | Play video             | Command to play the video.                                                                     |
| 300  | Someone ready          | Marks a user as ready; updates UI.                                                             |
| 301  | Someone unready        | Marks a user as not ready; updates UI, may pause video.                                        |




| **Group**                        | **Codes**                | **Purpose / Meaning**                | **Action Taken**                                                                              |
| -------------------------------- | ------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| **Video Playback Control**       | 205, 206                 | Pause / Play video                   | Commands to pause or play the video for all clients.                                          |
| **Video Seeking / Sync**         | 90, 91, 201, 202, 98, 97 | Video time control & synchronization | Start/end seek, sync time check, force time change, send or set current time.                 |
| **User Connection / Management** | 96, 109, 200             | User IP and joining/leaving          | Set my IP, handle user joining or leaving, update members list and UI.                        |
| **Ready Status Management**      | 300, 301, 198, 199       | Ready/unready states of users        | Someone marks ready/unready, load ready members list, request ready members list from others. |
