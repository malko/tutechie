#Tutechie
Tutechie is a lightweight touch event support library compatible with jquery / zepto or [basic-compat][1] (basic compat is a really basic compatibility layer with zepto/jquery)
The goal of this library is to allow binded interaction to work the same on desktop and mobile browsers.

## Implemented events:
events names all starts with a capital letter to avoid conflict with any additional loaded library.

- **Touchstart:** triggered at touch start or mousedown if no touchStart event is enabled on android you should preventDefault the event emitted to track down further events
- **Tap:** triggered when no movement occured and touch event is released before a Heldtap is triggered
- **Heldtap:** this is a tap which duration was longer than longDelay it doesn't require to be ended to get triggered (no need to release the touchEvent)
- **Move:** triggered after a Touchstart when moving arround more than treshold (extra event properties: pageX,pageY,distanceX,distanceY)
- **Moveend:** triggered after a Move event occured when the user release the touch event (same extra properties as Move events)
- **Swipe:** triggered when a user Move more than treshold px in a given direction (extra event properties: direction)
- **Zoomin/Zoomout:** this is a pinch open/close or a mousewheel event (extra event properties: isTouchEvent)

[1]: https://github.com/malko/basic-compat
