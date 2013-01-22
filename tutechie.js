/*global $*/
/*jshint expr:true*/
/**
* Tutechie.js is a library made to support some basic touch/mouse events cross browser (depending on the underlying library u use).
* it can be used with basic-compat.js or zepto or even jquery
* it add following custom events :
* - Touchstart: triggered at touch start or mousedown if no touchStart event is enabled on android you should preventDefault the event emitted to track down further events
* - Tap: triggered when no movement occured and touch event is released before a Heldtap is triggered
* - Heldtap: this is a tap which duration was longer than longDelay it doesn't require to be ended to get triggered (no need to release the touchEvent)
* - Move: triggered after a Touchstart when moving arround more than treshold (extra event properties: pageX,pageY,distanceX,distanceY)
* - Moveend: triggered after a Move event occured when the user release the touch event (same extra properties as Move events)
* - Swipe: triggered when a user Move more than treshold px in a given direction (extra event properties: direction)
* - Zoomin/Zoomout: this is a pinch open/close or a mousewheel event (extra event properties: isTouchEvent)
* @param {Object} $ Description
* @returns {Object}  Description
* @author jgotti at modedemploi dot fr for agence-modedemploi.com
* @licence Dual licence LGPL / MIT
*/
(function($){
	"user strict";

	var tcEvent= {}
		, startPosition={}
		, currentPosition = {}
		, distance = {}
		, treshold  = 20
		, longDelay = 500
		, longDelayCb = null
		, b = $(document)
		, scale = 1
		, emulateGesture = 'ongesturestart' in window ? false : {}
		, touchCapable = 'ontouchstart' in window  ? true : false
		, scrollDetection = (emulateGesture && touchCapable) ? {interval:null,lastPos:[]} : false
	;

	function extendEvent(e,props){
		var type,event;
		if( typeof props === 'string' ){
			type = props;
			props = {};
		}else{
			type = props.type || e.type;
			delete props.type;
		}
		props.originalEvent = e;
		props.pageX = currentPosition.x;
		props.pageY = currentPosition.y;
		event = $.Event(type,props);
		event.preventDefault = function(){
			if( e.preventDefault ){
				e.preventDefault();
			}else{
				e.returnValue=false;
			}
		};
		event.stopPropagation = function(){
			if( e.stopPropagation ){
				e.stopPropagation();
			}
			e.cancelBubble = true;
		};
		return event;
	}

	function resetEvent(e){
		tcEvent  = {target:null,type:null,touchEvent:false,running:false};
		startPosition = {x:0,y:0};
		currentPosition = {x:0,y:0};
		distance = {x:0,y:0};
		if( longDelayCb ){
			clearTimeout(longDelayCb);
			longDelayCb = null;
		}
		if( scrollDetection ){
			scrollDetection.interval && clearInterval(scrollDetection.interval);
			scrollDetection.lastPos=[];
			scrollDetection.interval = null;
		}
		if( e && e.target){
			tcEvent.target = e.target;
			tcEvent.running = true;
			var p = getPositionHolder(e),p2;
			startPosition.x = p.pageX;
			startPosition.y = p.pageY;
			currentPosition = {x:startPosition.x,y:startPosition.y};
			if( emulateGesture && (p2=getPositionHolder(e,1)) && p2.pageX){
				startPosition.x2 = p2.pageX;
				startPosition.y2 = p2.pageY;
				startPosition.distance = Math.sqrt(Math.pow(startPosition.x2 - startPosition.x,2) + Math.pow(startPosition.y2 - startPosition.y,2));
			}
			if( scrollDetection ){
				scrollDetection.lastPos = [window.pageXOffset,window.pageYOffset];
				scrollDetection.interval=setInterval(function(){
					if( window.pageXOffset !== scrollDetection.lastPos[0] || window.pageYOffset!==scrollDetection.lastPos[1]){
						b.off('touchmove',moveEvent);
						resetEvent();
					}
				},50);
			}
		}
	}
	function getTouches(e){
		return e.changedTouches || (e.originalEvent && e.originalEvent.changedTouches) || null;
	}
	function getPositionHolder(e,touchPos){
		touchPos !== undefined || (touchPos = 0);
		var holder=e, touches = getTouches(e);
		if( touches && touches.length ){
			tcEvent.touchEvent = true;
			holder =  touches[touchPos];
		}else{
			tcEvent.touchEvent = false;
		}
		return holder;
	}
	function setXYFromEvent(e){
		var p = getPositionHolder(e);
		currentPosition.x=p.pageX;
		currentPosition.y=p.pageY;
		distance.x = currentPosition.x - startPosition.x;
		distance.y = currentPosition.y - startPosition.y;
		return currentPosition;
	}

	function fillEmulateGesture(e){
		var pos=getPositionHolder(e,1),lastDistance=emulateGesture.distance||startPosition.distance;
		emulateGesture = {
			x:pos.pageX
			,y:pos.pageY
			,distance: Math.sqrt(Math.pow(pos.pageX - currentPosition.x,2) + Math.pow(pos.pageY - currentPosition.y,2))
		};
		if( Math.abs(emulateGesture.distance - lastDistance) < treshold/2 ){
			emulateGesture.distance = lastDistance;
		}
		emulateGesture.scale = emulateGesture.distance / startPosition.distance;
	}

	function eventStart(e){
		var touches = getTouches(e);
		if( touches && touches.length ){
			tcEvent.touchEvent = true;
		}else{
			if( e.button !== 0){ return; } // don't track non left mouse button events
			tcEvent.touchEvent = false;
		}
		if( tcEvent && tcEvent.type ){
			return;
		}
		resetEvent(e);
		var event = extendEvent(e,'Touchstart');
		$(tcEvent.target).trigger(event);
		longDelayCb = setTimeout(function(){ tcEvent.running && (tcEvent.type === null) && longTapEnd(e); },longDelay);
	}

	function eventEnd(e){
		if( tcEvent.touchEvent===false  && e.button !== 0){ return; } // don't track non left mouse button events
		if(! tcEvent.running ){ return; }

		setXYFromEvent(e);
		if( tcEvent.type === null && Math.abs(distance.x) < treshold && Math.abs(distance.y) < treshold ){
			$(tcEvent.target).trigger(extendEvent(e,'Tap'));
			//moveEnd(e);
			resetEvent();
			return;
		}
		if( tcEvent.type !== 'Move'){
			tcEvent.type === 'gesture' && gestureEventEnd(e);
			return;
		}
		var eventData;
		if( Math.abs(distance.x) > Math.abs(distance.y)){
			eventData={direction:distance.x < 0 ? 'left' : 'right'};
		}else{
			eventData={direction:distance.y < 0 ? 'up' : 'down'};
		}
		eventData.type = 'Swipe';
		$(tcEvent.target).trigger(extendEvent(e,eventData));
		moveEnd(e);
		resetEvent();
	}

	function longTapEnd(e){
		if(tcEvent.type !== null || ! tcEvent.running ){ return; }
		if( treshold > Math.abs(distance.x) && treshold > Math.abs(distance.y) ){ // this is a longtap event
			b.off(tcEvent.touchEvent?'touchmove':'mousemove',moveEvent); // stop tracking movement
			tcEvent.type = 'Heldtap';
			$(tcEvent.target).trigger(extendEvent(e,'Heldtap'));
			resetEvent();
		}
	}

	function moveEvent(e){
		setXYFromEvent(e);
		if(! tcEvent.running ){ return; }
		var touches = getTouches(e);
		if( tcEvent.type !== 'gesture' && tcEvent.touchEvent && emulateGesture && touches && touches.length > 1){ // we consider to be in a gestureEvent
			return gestureEventStart(e);
		}
		if( emulateGesture && tcEvent.type === 'gesture'){
			return gestureEvent(e);
		}
		if( tcEvent.type !== 'Move' && Math.abs(distance.x) < treshold && Math.abs(distance.y) < treshold){
			return;
		}else if(tcEvent.type && tcEvent.type !== 'Move'){
			return;
		}
		tcEvent.type = 'Move';
		$(tcEvent.target).trigger(extendEvent(e,{
			type:'Move'
			,pageX:currentPosition.x
			,pageY:currentPosition.y
			,distanceX:distance.x
			,distanceY:distance.y
		}));
	}

	function moveEnd(e){
		setXYFromEvent(e);
		if(! tcEvent.running){ return;}
		/*if( tcEvent.type==='gesture'){
			return gestureEventEnd(e);
		}*/
		if( tcEvent.type !== 'Move'){ return; }
		$(tcEvent.target).trigger(extendEvent(e,{
			type:'Moveend'
			,pageX:currentPosition.x
			,pageY:currentPosition.y
			,distanceX:distance.x
			,distanceY:distance.y
		}));
	}


	function gestureEventStart(e){
		if( tcEvent.type !== null ){
			return;
		}
		if( 'scale' in e){
			scale = e.scale;
		}else{
			fillEmulateGesture(e);
			scale = 1;
		}
		resetEvent(e);
		tcEvent.type = 'gesture';
	}
	function gestureEvent(e){
		var direction,event;
		if( e.wheelDelta ){
			direction = e.wheelDelta > 0 ?'in':'out';
			event = extendEvent(e,{
				type: 'Zoom'+direction
				,direction: direction
				,isTouchEvent:false
			});
		}else if( e.detail ){
			direction = e.detail < 0 ?'in':'out';
			event = extendEvent(e,{
				type: 'Zoom'+direction
				,direction: direction
				,isTouchEvent:false
			});
		}else if( e.scale !== scale ){
			if( emulateGesture ){
				fillEmulateGesture(e);
				e.scale = emulateGesture.scale;
				if( scale === e.scale){ return; }
			}
			direction = e.scale > scale ?'in':'out';
			event = extendEvent(e,{
				type: 'Zoom'+direction
				,direction: direction
				,isTouchEvent:true
			});
			scale = e.scale;
		}
		if(direction){
			$(tcEvent.target).trigger(event);
			(event.type = 'Zoom') && $(e.target).trigger(event);
		}
	}
	function gestureEventEnd(e){
		scale = 1;
		emulateGesture && (emulateGesture={});
		resetEvent();
	}


	$(function(){
		if(! emulateGesture){
			b.on('gesturestart',gestureEventStart)
				.on('gesturechange',gestureEvent)
				.on('gestureend',gestureEventEnd)
			;
		}else if(! touchCapable) {
			if('onmousewheel' in window){
				b.on('mousewheel',function(e){
					!e && (e = window.event);
					if( e.target && e.target.nodeType && e.target.nodeType===3){
						return;
					}
					gestureEventStart(e);
					gestureEvent(e);
					gestureEventEnd(e);
				});
			}else{
				b.on('DOMMouseScroll',function(e){
					gestureEventStart(e);
					gestureEvent(e);
					gestureEventEnd(e);
				});
			}
		}
		if( touchCapable){
			b
				.on('touchstart',function(e){
					b.on('touchmove',moveEvent);
					eventStart(e);
				})
				.on('touchend',function(e){
					b.off('touchmove',moveEvent);
					eventEnd(e);
				})
				.on('blur touchcancel',function(){ //stop tracking touch events when loosing focus
					b.off('touchmove',moveEvent);
					resetEvent();
				})
			;
		}else{
			b
				.on('mousedown',function(e){
					b.on('mousemove',moveEvent);
					eventStart(e);
				})
				.on('mouseup',function(e){
					b.off('mousemove',moveEvent);
					eventEnd(e);
				})
				.on('blur',function(){ //stop tracking touch events when loosing focus
					b.off('mousemove',moveEvent);
					resetEvent();
				})
			;
		}
	});

})($);