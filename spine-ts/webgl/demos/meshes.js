var meshesDemo = function(pathPrefix, loadingComplete) {
	var canvas, gl, renderer, input, assetManager;
	var skeleton, bounds;		
	var lastFrameTime = Date.now() / 1000;
	var skeletons = {};
	var activeSkeleton = "Orange Girl";

	var playButton, timeLine, isPlaying = true;

	function init () {
		canvas = document.getElementById("meshesdemo-canvas");
		canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
		gl = canvas.getContext("webgl", { alpha: false }) || canvas.getContext("experimental-webgl", { alpha: false });	

		renderer = new spine.webgl.SceneRenderer(canvas, gl);
		renderer.skeletonDebugRenderer.drawRegionAttachments = false;
		assetManager = new spine.webgl.AssetManager(gl, pathPrefix);		
		assetManager.loadTexture("orangegirl.png");
		assetManager.loadText("orangegirl.json");
		assetManager.loadText("orangegirl.atlas");
		assetManager.loadTexture("greengirl.png");		
		assetManager.loadText("greengirl.json");
		assetManager.loadText("greengirl.atlas");
		assetManager.loadTexture("armorgirl.png");		
		assetManager.loadText("armorgirl.json");
		assetManager.loadText("armorgirl.atlas");
		requestAnimationFrame(load);
	}	

	function load () {
		if (assetManager.isLoadingComplete()) {
			skeletons["Orange Girl"] = loadSkeleton("orangegirl", "animation");
			skeletons["Green Girl"] = loadSkeleton("greengirl", "animation");
			skeletons["Armor Girl"] = loadSkeleton("armorgirl", "animation");
			setupUI();
			loadingComplete(canvas, render);			
		} else requestAnimationFrame(load);
	}

	function setupUI() {
		playButton = $("#meshesdemo-playbutton");
		var playButtonUpdate = function () {			
			isPlaying = !isPlaying;
			if (isPlaying) {
				playButton.val("Pause");
				playButton.addClass("pause").removeClass("play");		
			} else {
				playButton.val("Play");
				playButton.addClass("play").removeClass("pause");
			}			
		}
		playButton.click(playButtonUpdate);

		timeLine = $("#meshesdemo-timeline");
		timeLine.slider({ range: "max", min: 0, max: 100, value: 0, slide: function () {
			if (isPlaying) playButton.click();		
			if (!isPlaying) {
				var active = skeletons[activeSkeleton];
				var time = timeLine.slider("value") / 100;
				var animationDuration = active.state.getCurrent(0).animation.duration;
				time = animationDuration * time;
				active.state.update(time - active.playTime);
				active.state.apply(active.skeleton);
				active.skeleton.updateWorldTransform();
				active.playTime = time;				
			}
		}});

		var list = $("#meshesdemo-active-skeleton");	
		for (var skeletonName in skeletons) {
			var option = $("<option></option>");
			option.attr("value", skeletonName).text(skeletonName);
			if (skeletonName === activeSkeleton) option.attr("selected", "selected");
			list.append(option);
		}
		list.change(function() {
			activeSkeleton = $("#meshesdemo-active-skeleton option:selected").text();
			var active = skeletons[activeSkeleton];
			var animationDuration = active.state.getCurrent(0).animation.duration;
			timeLine.slider("value", (active.playTime / animationDuration * 100));
		})

		renderer.skeletonDebugRenderer.drawBones = false;
		$("#meshesdemo-drawbonescheckbox").click(function() {
			renderer.skeletonDebugRenderer.drawBones = this.checked;
		})

		renderer.skeletonDebugRenderer.drawMeshHull = false;
		renderer.skeletonDebugRenderer.drawMeshTriangles = false;
		$("#meshesdemo-drawmeshtrianglescheckbox").click(function() {
			renderer.skeletonDebugRenderer.drawMeshHull = this.checked;
			renderer.skeletonDebugRenderer.drawMeshTriangles = this.checked;
		})
	}

	function loadSkeleton(name, animation, sequenceSlots) {
		var atlas = new spine.TextureAtlas(assetManager.get(name + ".atlas"), function(path) {
			return assetManager.get(path);		
		});
		var atlasLoader = new spine.TextureAtlasAttachmentLoader(atlas);
		var skeletonJson = new spine.SkeletonJson(atlasLoader);
		var skeletonData = skeletonJson.readSkeletonData(assetManager.get(name + ".json"));
		var skeleton = new spine.Skeleton(skeletonData);
		skeleton.setSkinByName("default");

		var state = new spine.AnimationState(new spine.AnimationStateData(skeletonData));
		state.setAnimation(0, animation, true);
		state.apply(skeleton);
		skeleton.updateWorldTransform();			
		var offset = new spine.Vector2();
		var size = new spine.Vector2();
		skeleton.getBounds(offset, size);

		return {
			atlas: atlas,
			skeleton: skeleton, 
			state: state, 
			playTime: 0,
			bounds: {
				offset: offset,
				size: size
			}			
		};
	}

	function render () {
		var now = Date.now() / 1000;
		var delta = now - lastFrameTime;
		lastFrameTime = now;	
		if (delta > 0.032) delta = 0.032;	

		var active = skeletons[activeSkeleton];
		var skeleton = active.skeleton;
		var state = active.state;
		var offset = active.bounds.offset;
		var size = active.bounds.size;

		renderer.camera.position.x = offset.x + size.x / 2;
		renderer.camera.position.y = offset.y + size.y / 2;
		renderer.camera.viewportWidth = size.x * 1.2;
		renderer.camera.viewportHeight = size.y * 1.2;
		renderer.resize(spine.webgl.ResizeMode.Fit);

		gl.clearColor(0.2, 0.2, 0.2, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);

		if (isPlaying) {
			var animationDuration = state.getCurrent(0).animation.duration;
			active.playTime += delta;			
			while (active.playTime >= animationDuration) {
				active.playTime -= animationDuration;
			}
			timeLine.slider("value", (active.playTime / animationDuration * 100));

			state.update(delta);
			state.apply(skeleton);
			skeleton.updateWorldTransform();
		}

		renderer.begin();				
		renderer.drawSkeleton(skeleton, true);
		renderer.drawSkeletonDebug(skeleton);
		renderer.end();		
	}

	init();
};