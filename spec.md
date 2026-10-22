Application Spec

Squat Monster

Application for measuring bar speed and bar path during a barbell lift using camera footage of the lift.

User experience should be as follows - User opens app to landing page with a large button in the center to start capturing video, along with instructions for how to set up the camera angle. The user takes a video of their set and then hits a button to finish recording.  

When the video is complete, use computer vision to analyze the video to track the path of the barbell.  When analysis is completed, the app displays a report about the set.

V1 Requirements
- Needs to work on iPhone and android and web
- A set may consist of an arbitrary number of reps but each video is limited to at most 60 seconds and a to-be-determined max file size.  If the video is longer than 60 seconds, reject and prompt the user to trim the video.
- Only support the Barbell Back Squat for analysis, but other suitable lifts for future versions include Deadlift, Overhead Press, Bench Press, Power Clean, Barbell Row, etc
- Camera angle must be side-on and be able to see the users entire body and the barbell including the entire profile view of the largest diameter weight plate on the filming side
- Report produced per set should include average and peak bar speed per rep, average and peak bar speed for the overall set, and data about bar path verticality, ie how much did the bar deviate horizontally from a perfectly vertical path?
- Rely on an assumed weight plate diameter to derive bar path distance
- Detect center of plate as proxy for where the barbell is in space
