var ImageRTS=function(options){
    this.el=document.getElementById(options.el);
    this.hammerBox=document.getElementById(options.hammerBox);
    this.createEvent=options.createEvent;
    // 参数
    this.image = {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        rotationCache: 0
        // centerX: size,
        // centerY: size
    };
    this.start = {
        x: 0,
        y: 0,
        scale: 1,
        rotation:0
    };
    // this.roleSize = {
    //     width:$('#portrait-container .role-img').width(),
    //     height:$('#portrait-container .role-img').height()
    // };
    // this.index = 0;
    this.pinchState=false;
    this.tapState=false;

    this.init();
}

ImageRTS.prototype.init=function(){
    this.hammerManager = new Hammer.Manager(this.hammerBox);
    this.bindHammerEvent();
    this.createEvent(this.createImg);
}

ImageRTS.prototype.bindHammerEvent=function(){
    this.hammerManager.add(new Hammer.Pinch({pointers: 2,threshold:0}));
    // threshold设置检测的最小阀值
    this.hammerManager.add(new Hammer.Pan({ threshold: 0, pointers: 1 }));
    // 改变pinch回调的this指向
    this.hammerManager.on('pinchstart pinchmove', this._onPinch.bind(this));
    this.hammerManager.on('pinchend pinchcancel',this._onPinchEnd.bind(this));
    this.hammerManager.on('panstart panmove', this._onPan.bind(this));
}

// 移动图片
ImageRTS.prototype._onPan = function(e) {
    if(this.pinchState) return;
    if (e.type == 'panstart') {
        this.start.x = this.image.x;
        this.start.y = this.image.y;
    }
    this.image.x = this.start.x + e.deltaX;
    this.image.y = this.start.y + e.deltaY;
    this._updateTransform();
};


// 缩放图片 以及旋转图片
ImageRTS.prototype._onPinch = function(e) {
    if (e.type == 'pinchstart') {
        this.start.scale = this.image.scale;
        this.startRotation=e.rotation;
        this.image.rotationCache=this.image.rotation;
    }
    this.image.rotation = (e.rotation-this.startRotation)+this.image.rotationCache;
    this.image.scale = this.start.scale * e.scale;
    if(this.image.scale<=0.2) this.image.scale = 0.2;
    this._updateTransform();
    this.pinchState=true;
};

ImageRTS.prototype._onPinchEnd=function(e){
    setTimeout(function(){
        this.pinchState=false;
    }.bind(this),200);
};

// 通过css3更新图片的位置
ImageRTS.prototype._updateTransform = function() {
    // 每次更新都要更新translate以及scale 因为只更新一个会被覆盖
    var value = [
        'translate(' + this.image.x + 'px,' + this.image.y + 'px)',
        'scale(' + this.image.scale + ')',
        'rotate(' + this.image.rotation + 'deg)'
    ];
    this._setTransform(value.join(' '));
};

ImageRTS.prototype._setTransform=function(v){
    this.el.style.webkitTransform = v;
    this.el.style.MozTransform = v;
    this.el.style.msTransform = v;
    this.el.style.OTransform = v;
    this.el.style.transform = v;
}

// 生成图片
ImageRTS.prototype.createImg=function(){

}

// ImageRTS.prototype.



