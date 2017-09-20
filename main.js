require(["base/hwsdk", "imageCreator/hammer.min"], function(hwsdk) {
    // 初始化hwsdk
    hwsdk.init();

    var Game = function(bestScore, config, domId) {
        // this.bestScore = bestScore || 0;
        this.config = config;
        this.domId = domId || '';
    };
    Game.prototype = {
        // 初始化标记
        isInit : false,
        qz_state : false,
        // 插入的domId
        domId : null,
        // 设备信息
        device : {
            type : null,
            platform : null,
            width : 0,
            height : 0
        },
        // 游戏内容，方便重置游戏
        gameContent: null,
        // 音频
        audios: {},
        // 图片
        imgs: {},
        // 音乐是否已经播放过
        isPlayed: false,
        // 是否已经播放过音乐了
        playedMusic: false,
        playState:false,
        head_img_url:'',
        isWeixin:false,
        isWeixinHack:false,

        // 初始化-设备信息
        initDevice : function() {
            this.device.width = game_width;
            this.device.height = game_height;
            if (game_width > game_height) {
                this.device.width = game_height;
                this.device.height = game_width;
            }
            this.device.platform = (navigator.userAgent.toLowerCase().indexOf('android') < 0) ? 'apple' : 'android';
            this.device.type = (this.device.width > 700) ? 'pad' : 'mobile';
        },

        // 初始化-游戏
        init : function() {
            // 显示加载页面
            hwsdk.showLoadingPage();
            var self = this;
            // 初始化设备信息
            this.initDevice();
            // 设置已进入初始化阶段
            this.isInit = true;
            // 加载资源
            this.load();
        },

        // 加载资源
        load: function() {

            var ua = window.navigator.userAgent.toLowerCase();
            if(ua.match(/MicroMessenger/i) == 'micromessenger'){
                this.isWeixin=true;
            }else{
                this.isWeixin=false;
            }

            var self = this;
            if(this.isWeixin){
                // 只有微信下才发起ajsx请求获取微信头像
                $.ajax({
                  type: 'GET',
                  url: '/game/gameAjax/GetHeadimgUrl',
                  // data to be added to query string:
                  dataType: 'json',
                  timeout:10000,
                  success: function(data){
                    if(data&&data.data&&data.data.head_img_url){
                        self.head_img_url=data.data.head_img_url;
                        self.imgs.role=self.head_img_url;
                        self.imageList.role=new Image();
                        self.imageList.role.crossOrigin="anonymous";
                        self.imageList.role.src=self.imgs.role;
                    }else{
                        self.isWeixinHack=true;
                        self.head_img_url = '//img-2.24haowan.shanyougame.com/player_headimg/-6.jpg';
                        self.imgs.role = self.head_img_url;
                        self.imageList.role = new Image();
                        self.imageList.role.crossOrigin = "anonymous";
                        self.imageList.role.src = self.imgs.role;
                    }
                  },
                  error:function(data){
                    setTimeout(function(){
                        self.head_img_url=headimgurl;
                        self.imgs.role=self.head_img_url;
                        self.imageList.role=new Image();
                        self.imageList.role.crossOrigin="anonymous";
                        self.imageList.role.src=self.imgs.role;
                    },5000)
                  }
                })
            }

            // 上线用 - 配置表中游戏内容的配置
            var configJSON = this.config['game'];
            // 加载图片资源
            this.imgs = {
                bg:configJSON["bg"],
            };
            // 所有需要加载的图片资源都写到这里来
            if(this.isWeixin){
                this.imgs.role='';
            }else{
                this.imgs.role='//img-2.24haowan.shanyougame.com/player_headimg/-6.jpg';
            }



            this.imageList={};

            // 分为两组预加载
            var imgLoaded = false;
            var imgLoadIndex=0;
            var currentLoadedImg = 0;
            var currentLoadedImg2 = 0;
            // 除去foreground这个特殊的数组
            var totalImg = Object.keys(configJSON).length - 1;
            var totalImg2 = configJSON.foreground.length;

            for (var index in configJSON) {
                if (typeof configJSON[index] != 'string') continue;
                this.imageList[index] = new Image();
                this.imageList[index].onload = this.imageList[index].onerror = function() {
                    ++currentLoadedImg;
                    if (currentLoadedImg == totalImg) {
                        imgLoadIndex++;
                        if (imgLoadIndex >= 2) {
                            // 加载完毕执行回调
                            imgLoaded=true;
                        }
                    }
                };
                this.imageList[index].crossOrigin="anonymous";
                if(index=='role'){
                    this.imageList[index].src = this.imgs.role;
                }else{
                    this.imageList[index].src = configJSON[index];
                }
            }

            for (var i = 0; i < totalImg2; i++) {
                var name = 'foreground_' + i;
                this.imageList[name] = new Image();
                this.imageList[name].onload = this.imageList[name].onerror = function() {
                    currentLoadedImg2++;
                    var progress = 80 * currentLoadedImg2 / totalImg2 + 20 * currentLoadedAudio / totalAudio;
                    hwsdk.configLoadingPage({progress: progress});
                    if (currentLoadedImg2 == totalImg2) {
                        imgLoadIndex++;
                        if (imgLoadIndex >= 2) {
                            // 加载完毕执行回调
                            imgLoaded=true;
                        }
                    }
                }
                this.imageList[name].crossOrigin="anonymous";
                this.imageList[name].src = configJSON.foreground[i];
            }

            // 加载音频资源
            // 所有需要加载的音频资源都写到这里来
            var audioList = {
                music_tap:configJSON['music_tap']
                // music_shake_sound: config['music_shake_sound'],
                // music_bg: config['music_bgm'],
                // music_clkGoldApple: config['music_clkGoldApple']
            };
            // 安卓系统只加载背景音乐
            if (this.device.platform == "android") {
                audioList = {
                    // music_bg: config['music_bgm']
                    music_tap:configJSON['music_tap']
                };
            }

            var audioLoaded = false;
            var currentLoadedAudio = 0;
            var totalAudio = (this.device.platform == "android") ? 1 : Object.keys(audioList).length;
            for (var index in audioList) {
                this.audios[index] = new Audio();
                this.audios[index].addEventListener("canplaythrough", audioOnload, false);
                this.audios[index].src = audioList[index];
                this.audios[index].load();
            }
            // 音频加载完毕回调
            function audioOnload() {
                this.removeEventListener("canplaythrough", audioOnload);
                ++currentLoadedAudio;
                if (currentLoadedAudio <= totalAudio) {
                    var progress = 80 * currentLoadedImg / totalImg + 20 * currentLoadedAudio / totalAudio;
                    hwsdk.configLoadingPage({progress: progress});
                    if (currentLoadedAudio == totalAudio) {
                        audioLoaded = true;
                    }
                }
            }

            // 加载时间锁，目的是为了让加载页至少停留3秒
            var loading_lock = true;
            setTimeout(function() {
                loading_lock = false;
                    var progress = 100;
                    hwsdk.configLoadingPage({progress: progress});
                    setTimeout(function() {
                        // 进入create状态
                        self.create();
                    }, 500);
            }, 3000); //上线时改回3000
        },

        // 开始状态
        create: function() {
            this.qz_state = true;
            // 上线用 - 设置游戏背景
            if (configJson["game"]["bg"].indexOf("#") != 0) {
                $("#createImg-container #portrait-container").css({
                    "background-image": "url('"+configJson["game"]["bg"]+"')",
                    "background-color": "transparent"
                });
                $("#createImg-container .create-showing").css({
                    "background-image": "url('"+configJson["game"]["bg"]+"')",
                    "background-color": "transparent"
                });
            } else {
                $("#createImg-container #portrait-container").css({
                    "background-image": "none",
                    "background-color": configJson["game"]["bg"]
                });
                $("#createImg-container .create-showing").css({
                    "background-image": "none",
                    "background-color": configJson["game"]["bg"]
                });
            }

            $("#createImg-container .portrait-top").css('background-image', 'url("' + configJson["game"]["banner"] + '")');
            $("#createImg-container .left").css('background-image', 'url("' + configJson["game"]["left-btn"] + '")');
            $("#createImg-container .right").css('background-image', 'url("' + configJson["game"]["right-btn"] + '")');
            $("#createImg-container .btn-create").css('background-image', 'url("' + configJson["game"]["create-btn"] + '")');
            $("#createImg-container .btn-upload").css('background-image', 'url("' + configJson["game"]["upload-btn"] + '")');
            $("#createImg-container .btn-again").css('background-image', 'url("' + configJson["game"]["again-btn"] + '")');
            $("#createImg-container .btn-reset").css('background-image', 'url("' + configJson["game"]["reset-btn"] + '")');

            //配置foreground
            var list = $('.img-wrapper ul');
            // 动态添加挂件
            var str = '';
            // 动态添加挂件对应的小点
            var str2 = '';
            var configList = configJson["game"]["foreground"];
            $('.portrait-tips').empty();
            list.empty();
            console.log(configList);
            for (var i = 0, len = configList.length; i < len; i++) {
                str += '<li style="background-image:url(' + configList[i] + ');"></li>';
                str2 += '<li class="portrait-tip"></li>';
            }
            console.log(str);
            list.append(str);
            if (configList.length !== 1){
                $('.bow').show();
                $('.portrait-tips').append(str2);
            }

            // 设置游戏内容，用于快速复原
            this.gameContent = $("#"+this.domId).html();

            // 加载完成-隐藏加载页面，显示开始页面，悬浮按钮
            hwsdk.hideLoadingPage().showPageBtn().showStartPage();
            // 在工作台中直接开始游戏
            if (skip) { // 工作台
                gameManager.play();
            } else { // 正常游戏
                hwsdk.showBox();
            }
        },

        // 游戏状态
        play: function() {

            if(!this.isWeixin||this.isWeixinHack){
                // 如果不是微信，则把头像赋值
                headimgurl='//img-2.24haowan.shanyougame.com/player_headimg/-6.jpg';
            }
            $('#portrait-container .role-img').css('background-image', 'url("' + headimgurl + '")');



            $("#createImg-container").css('visibility','visible')
            if(this.playState==false) {
                this.playState=true;
            }else{
                return;
            }
            // 此处写游戏逻辑
            var self = this;

            var timer = 0;

            var isPlaying = false;


            // 移动端浏览器第一次播放音乐会有卡顿现象，音乐先播放一下可以解决此问题。
            if (!this.isPlayed) {
                for (var index in this.audios) {
                    this.audios[index].muted = true;
                    this.audios[index].play();
                    this.audios[index].pause();
                    this.audios[index].currentTime = 0;
                    this.audios[index].muted = false;
                }
                this.isPlayed = true;
            }

            var container = $('#portrait-container');
            var size = 320;


            var moveBox = $('#portrait-container');
            var mask = $('.portrait-mask');
            var roleImg = $('.role-img');
            var createBtn = $('.btn-create');
            var createShowing = $('.create-showing');
            var createWrap = $('.create-wrap');
            var createText = $('.create-text');
            var fileImage = $('.file-image');
            var portraitBtnWrap = $('.portrait-btn-wrap');
            var uploadBtnWrap = $('.upload-btn-wrap');
            var againBtn = $('.btn-again');
            var resetBtn = $('.btn-reset');
            var list = $('.img-wrapper ul');


            var event_tap;
            if ('ontouchstart' in document.documentElement || (window.navigator.maxTouchPoints && window.navigator.maxTouchPoints >= 1)) {
                event_tap='tap';
            } else {
                event_tap='click';
            }

            var ImageCreator = function() {
                this.hammerManager = new Hammer.Manager(moveBox[0]);
                this.image = {
                    x: 0,
                    y: 0,
                    scale: 1,
                    rotation: 0,
                    rotationCache: 0,
                    centerX: size,
                    centerY: size
                };
                this.start = {
                    x: 0,
                    y: 0,
                    scale: 1,
                    rotation:0
                };
                this.roleSize = {
                    width:$('#portrait-container .role-img').width(),
                    height:$('#portrait-container .role-img').height()
                };
                this.index = 0;
                this.pinchState=false;
                this.tapState=false;
            };

            ImageCreator.prototype.init = function() {
                this.bindPreventDefault();
                // this.draw();
                this.bindEvent();
                this.bindHammerEvent();
                // 根据配置表配置轮播图的5张图片
                this.configImage();
                // 绑定轮播图事件
                this.bindSlide();
                // 绑定上传图片回调
                this.uploadImage();
                // 绑定再做一个事件
                this.bindBackEvent();
                // 绑定复原头像的事件
                this.resetImageEvent();
                // 绑定引导页面的按钮事件
                this.guideEvent();
                // 绑定更换头像按钮音乐
                this.uploadImageMusic();
                // $('body').on('tap',function(){
                //     console.log($('ul').css('transform'));
                //     console.log($('li')[0].style.transform);
                // })
            };

            ImageCreator.prototype.uploadImageMusic=function(){
                $('#portrait-container label').on(event_tap,function(){
                    if (self.audios["music_tap"] && music_flag) {
                       self.audios["music_tap"].play()
                    }
                })
            };

            ImageCreator.prototype.guideEvent=function(){
                $('#createImg-container .mask-btn').on(event_tap,function(){
                    $('#createImg-container #portrait-mask').addClass('animated fadeOutUp');
                    setTimeout(function(){
                        $('#createImg-container .portrait-mask').hide();
                    },400);
                });
            };

            ImageCreator.prototype.resetImageEvent = function() {
                resetBtn.on(event_tap, function() {
                    if (self.audios["music_tap"] && music_flag) {
                       self.audios["music_tap"].play()
                    }
                    mask.show();
                    uploadBtnWrap.hide();
                    portraitBtnWrap.show();
                    this.setImageSrc(self.imgs.role,headimgurl);
                    this.resetTransform();
                    this.maskHide();
                }.bind(this));
            };

            ImageCreator.prototype.bindBackEvent = function() {
                againBtn.on(event_tap, function() {
                    if (self.audios["music_tap"] && music_flag) {
                       self.audios["music_tap"].play()
                    }
                    setTimeout(function() {
                        createShowing.hide();
                    }, 400)
                    this.maskHide();
                    createShowing.removeClass('animated fadeInDown');
                    createShowing.addClass('animated fadeOutUp');
                }.bind(this))
            };

            ImageCreator.prototype.maskHide = function() {
                setTimeout(function() {
                    mask.hide();
                }, 400);
            }

            ImageCreator.prototype.uploadImage = function() {
                var context = this;
                fileImage.on('change', function() {
                    var fileList = this.files;
                    if (fileList[0]) {
                        var url = window.URL.createObjectURL(fileList[0]);
                        // 修改按钮的显示
                        if (portraitBtnWrap.css('display') == 'block') {
                            portraitBtnWrap.hide();
                            uploadBtnWrap.show();
                        }
                        context.setImageSrc(url);
                        context.resetTransform();
                    }
                    $(this).val("");
                });
            };

            // 更改图片的src
            ImageCreator.prototype.setImageSrc = function(url,headimgurl) {
                if(headimgurl){
                    roleImg.css('background-image', 'url("' + headimgurl + '")');
                }else{
                    roleImg.css('background-image', 'url("' + url + '")');
                }
                self.imageList.role = new Image();
                self.imageList.role.crossOrigin="anonymous";
                self.imageList.role.src = url;
            }

            //重置图片的transform
            ImageCreator.prototype.resetTransform = function() {
                // 每次上传新的图片都需要重置一次transform
                var value = [
                    'translate(' + 0 + 'px,' + 0 + 'px)',
                    'scale(' + 1 + ')',
                    'rotate(' + 0 + 'deg)'
                ];
                roleImg.css({
                    'transform': value.join(''),
                    '-webkit-transform': value.join('')
                });
                this.image = {
                    x: 0,
                    y: 0,
                    scale: 1,
                    rotation: 0,
                    rotationCache: 0,
                    centerX: size,
                    centerY: size
                };
                this.start = {
                    x: 0,
                    y: 0,
                    scale: 1,
                    rotation: 0
                };
                this.startRotation=0;
            };

            //根据参数图片配置挂件
            ImageCreator.prototype.configImage = function() {
                // // 动态添加挂件
                // var str = '';
                // // 动态添加挂件对应的小点
                // var str2 = '';
                // var configList = configJson["game"]["foreground"];
                // console.log(configList);
                // $('.portrait-tips').empty();
                // list.empty();
                // for (var i = 0, len = configList.length; i < len; i++) {
                //     str += '<li style="background-image:url(' + configList[i] + ');"></li>';
                //     str2 += '<li class="portrait-tip"></li>';
                // }
                // list.append(str);
                // if (configList.length == 1) return;
                // $('.bow').show();
                // $('.portrait-tips').append(str2);
            };

            ImageCreator.prototype.bindSlide = function() {
                var self = this;
                var slideTab = $('.img-wrapper').swipeSlide({
                    continuousScroll: true,
                    autoSwipe: false,
                    lazyLoad: false,
                    transitionType: 'linear',
                    index: 0,
                    speed: 4000,
                    firstCallback: function(i) {
                        $('.portrait-tip').eq(i).addClass('cur');
                    },
                    callback: function(i) {
                        $('.portrait-tip').eq(i).addClass('cur').siblings().removeClass('cur');
                        self.index = i;
                    }
                });
                $('.left').on(event_tap, function(i) {
                    if(self.tapState) return;
                    self.tapState=true;
                    slideTab[0].goTo('prev');
                    setTimeout(function(){
                        self.tapState=false;
                    },300);
                });
                $('.right').on(event_tap, function(i) {
                    if(self.tapState) return;
                    self.tapState=true;
                    slideTab[0].goTo('next');
                    setTimeout(function(){
                        self.tapState=false;
                    },300);
                });
            };

            // 阻止双击默认事件
            ImageCreator.prototype.bindPreventDefault = function() {
                document.body.ontouchmove = function(event) {
                    event.preventDefault();
                };

                var agent = navigator.userAgent.toLowerCase(); //检测是否是ios
                var iLastTouch = null; //缓存上一次tap的时间
                if (agent.indexOf('iphone') >= 0 || agent.indexOf('ipad') >= 0) {
                    document.body.addEventListener('touchend', function(event) {
                        var iNow = new Date()
                            .getTime();
                        iLastTouch = iLastTouch || iNow + 1 /** 第一次时将iLastTouch设为当前时间+1 */ ;
                        var delta = iNow - iLastTouch;
                        if (delta < 500 && delta > 0) {
                            event.preventDefault();
                            return false;
                        }
                        iLastTouch = iNow;
                    }, false);
                }
            };

            // 绑定hammer事件 如pinch
            ImageCreator.prototype.bindHammerEvent = function() {
                this.hammerManager.add(new Hammer.Pinch({pointers: 2,threshold:0}));
                // threshold设置检测的最小阀值
                this.hammerManager.add(new Hammer.Pan({ threshold: 0, pointers: 1 }));
                // 改变pinch回调的this指向
                this.hammerManager.on('pinchstart pinchmove', this._onPinch.bind(this));
                this.hammerManager.on('pinchend pinchcancel',this._onPinchEnd.bind(this));
                this.hammerManager.on('panstart panmove', this._onPan.bind(this));
            };

            // 移动图片
            ImageCreator.prototype._onPan = function(e) {
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
            ImageCreator.prototype._onPinch = function(e) {
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

            ImageCreator.prototype._onPinchEnd=function(e){
                setTimeout(function(){
                    this.pinchState=false;
                }.bind(this),200);
            };

            // 通过css3更新图片的位置
            ImageCreator.prototype._updateTransform = function() {
                // 每次更新都要更新translate以及scale 因为只更新一个会被覆盖
                var value = [
                    'translate(' + this.image.x + 'px,' + this.image.y + 'px)',
                    'scale(' + this.image.scale + ')',
                    'rotate(' + this.image.rotation + 'deg)'
                ];
                roleImg.css({
                    'transform': value.join(''),
                    '-webkit-transform': value.join('')
                });
            };


            // 私有，绘制图片
            ImageCreator.prototype._draw = function(ctx, img, x, y, scale) {
                ctx.drawImage(img, 0, 0, img.width, img.height, x, y, img.width * scale, img.height * scale);
                ctx.restore();
            };

            ImageCreator.prototype.drawRole = function(ctx) {
                // 绘制底色，白色
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, 2 * size, 2 * size);

                // 要做图片的适配，以最大边为缩放参考，做到contain效果
                if (self.imageList.role.width > self.imageList.role.height) {
                    var scaleRole = size * 2 / self.imageList.role.width;
                } else {
                    scaleRole = size * 2 / self.imageList.role.height;
                }

                scaleRole = scaleRole * this.image.scale;

                //这是一段神奇的代码 x y 是修正缩放之后的位置差
                var width = self.imageList.role.width * 2 * scaleRole / 2;
                var height = self.imageList.role.height * 2 * scaleRole / 2;

                var x = this.image.centerX - width / 2;
                var y = this.image.centerY - height / 2;

                var imageX=this.image.x/this.roleSize.width*640;
                var imageY=this.image.y/this.roleSize.height*640;

                var scaleWidth=self.imageList.role.width*scaleRole;
                var scaleHeight=self.imageList.role.height*scaleRole;

                // 增加旋转的功能
                ctx.save();
                ctx.translate(imageX + x+scaleWidth/2,imageY + y+scaleHeight/2);
                ctx.rotate(this.image.rotation*Math.PI/180);

                this._draw(ctx, self.imageList.role, -scaleWidth/2, -scaleHeight/2, scaleRole);

            };

            ImageCreator.prototype.drawBg = function(ctx) {

                // 绘制前景 根据当前轮播的index绘制
                var name = 'foreground_' + (this.index);
                if(self.imageList[name].width>self.imageList[name].height){
                    var scaleBg = size * 2 / self.imageList[name].width;
                }else{
                    scaleBg = size * 2 / self.imageList[name].height;
                }
                var x=(size*2-self.imageList[name].width*scaleBg)/2;
                var y=(size*2-self.imageList[name].height*scaleBg)/2;
                this._draw(ctx, self.imageList[name], x, y, scaleBg);
            };

            ImageCreator.prototype.showing = function(canvas) {
                var data = canvas.toDataURL("image/jpeg", 1.0);
                var str = '<img src="';
                str += canvas.toDataURL();
                str += '" class="img"/>';
                str += '<p class="create-text">长按图片保存</p>';
                createWrap.empty();
                createWrap.append(str);
                createShowing.show();
                mask.show();
                createShowing.removeClass('animated fadeOutUp');
                createShowing.addClass('animated fadeInDown');
            };

            ImageCreator.prototype.createImg = function() {

                var canvas = $('<canvas></canvas>');
                // 高清适配
                canvas.css('width', size + 'px');
                canvas.css('height', size + 'px');
                canvas[0].width = size * 2;
                canvas[0].height = size * 2;

                //这部分只是为了显示canvas绘制的内容 用于测试
                //canvas.css('position', 'absolute');
                //canvas.css('left', '0');
                //canvas.css('top', '0');
                // canvas.css('border', '1px solid black')

                var ctx = canvas[0].getContext('2d');

                this.drawRole(ctx);
                this.drawBg(ctx);
                this.showing(canvas[0]);

            };

            // 绑定html事件
            ImageCreator.prototype.bindEvent = function() {
                var context=this;
                console.log(self.isWeixin);
                createBtn.on(event_tap, function() {
                    if (self.audios["music_tap"] && music_flag) {
                       self.audios["music_tap"].play()
                    }

                    if(self.imgs.role){
                        context.createImg();
                    }else{
                        $('#createImg-container .loading-mask').show();
                        var timer=setInterval(function(){
                            if(self.imgs.role){
                                clearInterval(timer);
                                $('#createImg-container .loading-mask').hide();
                                context.createImg();
                            }
                        },500);
                    }
                });
            }

            var imageCreator=new ImageCreator();
            imageCreator.init();

            // 进入结束状态，具体进入时间由实际情况而定
            // self.end();
        },

        // 结束状态
        end: function() {
            this.reset();
        },

        // 重置游戏数据和dom结构
        reset: function() {
            // 直接把内容替换掉，
            $("#"+this.domId).children().remove();
            $("#"+this.domId).html(this.gameContent);
        },

        // 再玩一次
        replay: function() {
            this.play();
        }

    }

    //启动游戏
    gameManager = new Game(bestScore, configJson, 'game_div');
    orientationChange(hwsdk.getDeviceOrientation());
    //绑定屏幕旋转事件
    hwsdk.onOrientationChanged(orientationChange);
    //根据设备屏幕方向启动游戏与否
    function orientationChange(direction) {
        if (direction == "portrait") { // 手机竖屏
            hwsdk.hideRotateMask();
            if (!gameManager.isInit) gameManager.init();
        } else if (direction == "landscape") {  //手机横屏
            hwsdk.showRotateMask();

        } else if (hwsdk.detectDevice() == "pc") { //PC直接启动
            gameManager.init();
        } else if (direction == "undefined" && hwsdk.detectDevice() == "mobile") {
            //PC开发者工具手机模式直接启动
            gameManager.init();
        }
    }
});
