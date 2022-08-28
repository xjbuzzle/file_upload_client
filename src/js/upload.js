// 延迟函数
const delay = function delay(interval) {
    typeof interval !== "number" ? interval = 1000 : null;
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, interval);
    });
};

//基于FormData实现的文件上传
(function () {
    //1.获取要用的DOM元素
    let upload = document.querySelector('#upload1'),
    upload_inp = upload.querySelector('.upload_inp'),
    upload_button_select = upload.querySelector('.upload_button.select'),
    upload_button_upload = upload.querySelector('.upload_button.upload'),
    upload_tip = upload.querySelector('.upload_tip'),
    upload_list = upload.querySelector('.upload_list');
    //将第3步中获取到的file对象，提取出来作为该闭包的全局对象
    let _file = null;

    //2.点击选择文件按钮，触发上传文件的input框选择文件的行为
    upload_button_select.addEventListener('click',function(){
        //7.如果当前按钮处于不可用状态，则不进行后续处理
        if(upload_button_select.classList.contains('disable') || upload_button_upload.classList.contains('loading')){
            return;
        }
        upload_inp.click();
    });

    //3.监听用户选择文件的操作
    upload_inp.addEventListener('change',function(){
        //如何获取用户选中的文件：upload_inp.files，此处为单文件上传,所以只获取数组第一项
        console.log('fileList',upload_inp.files);
        let file = upload_inp.files[0];
        if(!file) return;
        /**
         * file对象：
         *  -name：文件名
         *  -size：文件大小
         *  -type：文件类型
         */

        //3.1控制文件上传的格式
        //方案一：基于JS->限制文件上传的格式，如果file的type中不包含这几个类型之一，则代表上传的类型不符合这三种
        // if(!/(PNG|JPG|JPEG)/i.test(file.type)){
        //     alert('上传的文件只能是 PNG/JPG/JPEG 三种类型');
        // }

        //方案二：在input的accept属性里面进行限制，<input type="file" class="upload_inp" accept=".png,.jpg,.jpeg">

        //3.2.限制文件上传的大小
        if(file.size > 2 * 1024 * 1024){
            alert('上传的文件大小不能超过2MB');
            return;
        }

        //确定文件符合规范后，转存到_file变量中，方便其他方法使用
        _file = file;

        //3.3显示上传的文件
        upload_tip.style.display = 'none';  //隐藏文件提示
        upload_list.style.display = 'block';  //展示文件列表
        upload_list.innerHTML = `<li>
        <span>文件：${file.name}</span>
        <span><em>移除</em></span>
        </li>`;

    });

    
    /**
     * 4.实现移除方法
     *  根据冒泡机制原理，当我们触发移除这个DOM的点击事件时，会逐层冒泡到其祖先元素上
     *  为了更便捷的处理，我们可以直接监听其祖先元素file_list的点击事件，这种操作一般我们称为事件委托
     *  此处用事件委托进行处理，还有几个原因是:
     *      -em这个DOM是我们动态添加的，也就是说一开始初始化的时候并没有这个DOM
     *      -后续对于多个文件上传的功能，会存在多个em，而为每个em都绑定click事件监听并不合理
     */
    upload_list.addEventListener('click',function(e){
        let target = e.target;
        if(target.tagName === 'EM'){  //判断点击的是不是移除按钮
            //移除文件并切换DOM显示状态
            handleClear();
        }
    });

    //将清空文件，即按需展示元素的功能封装起来，以便移除方法和上传成功与失败时执行
   const handleClear = () =>{
        _file = null;  //清除文件
        upload_tip.style.display = 'block';  //显示文件提示
        upload_list.style.display = 'none';  //隐藏文件列表
        upload_list.innerHTML = ``;  //清空列表
    }

    /**
     * 5.使用axios发请求，上传文件到服务器
    */
   upload_button_upload.addEventListener('click',function(){
        //8.如果当前按钮处于不可用状态，则不进行后续处理
        if(upload_button_select.classList.contains('disable') || upload_button_upload.classList.contains('loading')){
            return;
        }
        if(!_file){  //直接点击上传，没有点击上传文件
            alert('请先选择要上传的文件');
            return;
        }

        //6.1开始上传，则让按钮变为不可操作的状态
        handleDisable(true);

        /**
         * 把文件传递给服务器的两种格式:
         *  -formData（此处用formData）
         *  -Base64
         * 结合服务端提供的api文档配置请求:（上传成功的文件在服务器端项目的upload文件夹中可以查看）
         * 1.单文件上传处理「FORM-DATA」:由服务器自动生成文件的名字
            url:/upload_single
            method:POST
            params:multipart/form-data
                file:文件对象
                filename:文件名字
            return:application/json
                code:0成功 1失败,
                codeText:状态描述,
                originalFilename:文件原始名称,
                servicePath:文件服务器地址
        */
        let formData = new FormData();
        formData.append('file',_file);
        formData.append('filename',_file.name);
        //instance是在instance.js文件中通过axios库创建的一个实例对象，进行了二次封装
        instance.post('/upload_single',formData).then(data=>{
            //此处data即为response.data，因为已提前在instance配置项中使用axios的拦截器interceptors，帮助我们过滤掉不需要的数据，只留下主体信息data
            if(+data.code === 0){ //code强制转换为number类型
                alert(`上传成功，可在 ${data.servicePath} 中查看 `);
                return;
            }
            return Promise.reject(data.codeText); //返回一个新的Promise对象，状态是rejected，在catch中捕获
        }).catch(reason=>{
            alert('文件上传失败，请稍后再试');
        }).finally(()=>{  //不论成功或者失败，最后都会执行的函数
            //移除文件并切换DOM显示状态
            handleClear();
            //6.2上传结束，恢复按钮的可操作功能
            handleDisable(false);
        });

   });

})();

//基于Base64实现的文件上传
(function () {
    //1.获取要用的DOM元素
    let upload = document.querySelector('#upload2');
    upload_inp = upload.querySelector('.upload_inp'),
    upload_button_select = upload.querySelector('.upload_button.select');

    //传递element验证是否可操作
    const checkIsDisable = element =>{
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    }

    //2.点击选择文件按钮，触发上传文件的input框选择文件的行为
    upload_button_select.addEventListener('click',function(){
        //7.如果当前按钮处于不可用状态，则不进行后续处理
        if(checkIsDisable(this)) return;
        upload_inp.click();
    });

    //4，把选择的文件对象转换成Base64格式
    const changeToBase64 = file =>{
        return new Promise(resolve =>{
            //利用网上的工具将图片转成Base64，也可以自己进行转换，JS提供了一个FileReader的类，可以帮助我们实现file->Base64
            let fileReader = new FileReader();
            fileReader.readAsDataURL(file);
            //通过fileReader进行读取和转换的过程是异步的，需要在onLoad()中进行后续操作
            fileReader.onload = e =>{
                resolve(e.target.result);
            }
        })
    }


    //3.监听用户选择文件的操作
    upload_inp.addEventListener('change',async function(){
        //如何获取用户选中的文件：upload_inp.files，此处为单文件上传,所以只获取数组第一项
        let file = upload_inp.files[0],base64File,data;
        if(!file) return;
        //3.1在input的accept属性里面进行文件格式的限制，<input type="file" class="upload_inp" accept=".png,.jpg,.jpeg">

        //3.2.限制文件上传的大小
        if(file.size > 2 * 1024 * 1024){
            alert('上传的文件大小不能超过2MB');
            return;
        }
        //5.上传中让按钮不可操作
        upload_button_select.classList.add('loading');

        base64File = await changeToBase64(file);

        /**
         * 根据api文档发送请求：
         * 3.单文件上传处理「BASE64」
            url:/upload_single_base64
            method:POST
            params:application/x-www-form-urlencoded
                file:BASE64
                filename:文件名字
            return:application/json
                code:0成功 1失败,
                codeText:状态描述,
                originalFilename:文件原始名称,
                servicePath:文件服务器地址
        */

        try{
            data = await instance.post('/upload_single_base64',{
                //防止传输过程中出现乱码，用encodeURLComponent()方法进行加密
                file: encodeURIComponent(base64File),
                filename: file.name
            },{
                headers:{
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            if(+data.code === 0){
                alert(`上传成功,可在${data.servicePath}中查看`);
                return;
            }
            //上传失败则抛出异常
            throw data.codeText;
        }catch(err){
            alert('文件上传失败，请重试');
        }finally{
            //5.上传结束让按钮可操作
            upload_button_select.classList.remove('loading');
        }


    });


})();


//文件缩略图&自动生成名字
(function () {
    //1.获取要用的DOM元素
    let upload = document.querySelector('#upload3'),
    upload_inp = upload.querySelector('.upload_inp'),
    upload_button_select = upload.querySelector('.upload_button.select'),
    upload_button_upload = upload.querySelector('.upload_button.upload'),
    upload_abbre = upload.querySelector('.upload_abbre'),
    upload_img = upload.querySelector('img');
    let _file = null;

    //传递element验证是否可操作
    const checkIsDisable = element =>{
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    }

    
    /**
     * 6.避免用户多次发起请求，类似于防抖，当点击上传后，我们手动调整按钮的状态为loading和disable
    */
     const handleDisable = flag =>{
        if(flag){ //让用户不可操作
            upload_button_select.classList.add('disable');
            upload_button_upload.classList.add('loading');
        }else{  //否则移除样式
            upload_button_select.classList.remove('disable');
            upload_button_upload.classList.remove('loading');
        }
    }

    //2.点击选择文件按钮，触发上传文件的input框选择文件的行为
    upload_button_select.addEventListener('click',function(){
        //7.如果当前按钮处于不可用状态，则不进行后续处理
        if(checkIsDisable(this)) return;
        upload_inp.click();
    });

    //4，把选择的文件对象转换成Base64格式，通过Base64作为缩略图展示
    const changeToBase64 = file =>{
        return new Promise(resolve =>{
            //利用网上的工具将图片转成Base64，也可以自己进行转换，JS提供了一个FileReader的类，可以帮助我们实现file->Base64
            let fileReader = new FileReader();
            fileReader.readAsDataURL(file);
            //通过fileReader进行读取和转换的过程是异步的，需要在onLoad()中进行后续操作
            fileReader.onload = e =>{
                resolve(e.target.result);
            }
        })
    }

    //file->Buffer
    const changeToBuffer = file =>{
        return new Promise(resolve =>{
            let fileReader = new FileReader();
            //读取成Buffer类型
            fileReader.readAsArrayBuffer(file);
            fileReader.onload = e =>{
                let buffer = e.target.result,
                spark = new SparkMD5.ArrayBuffer(),
                hash;
                spark.append(buffer);
                hash = spark.end();  //spark拿到buffer处理成hash
                suffix = /\.([A-z]+)$/.exec(file.name)[1];  //在文件里面获取文件名，即以.xxx结尾的部分
                //最终生成的是hash加上文件名后缀
                resolve({
                    buffer,
                    hash,
                    suffix,
                    filename: `${hash}.${suffix}`
                })
            }
        })
    }

    //3.监听用户选择文件的操作
    upload_inp.addEventListener('change',async function(){
        //如何获取用户选中的文件：upload_inp.files，此处为单文件上传,所以只获取数组第一项
        let file = upload_inp.files[0],base64File,data;
        if(!file) return;
        _file = file;
        //3.1在input的accept属性里面进行文件格式的限制，<input type="file" class="upload_inp" accept=".png,.jpg,.jpeg">

        //3.2.限制文件上传的大小
        if(file.size > 2 * 1024 * 1024){
            alert('上传的文件大小不能超过2MB');
            return;
        }

        upload_button_select.classList.add('disable');
        //文件预览，就是把文件对象转成base64赋值给img的src进行展示
        base64File = await changeToBase64(file);
        upload_abbre.style.display = 'block';
        upload_img.src = base64File;
        upload_button_select.classList.remove('disable');

    });


    
    /**
     * 5.使用axios发请求，上传文件到服务器
    */
   upload_button_upload.addEventListener('click', async function(){
    //8.如果当前按钮处于不可用状态，则不进行后续处理
    if(checkIsDisable(this)) return;
    if(!_file){  //直接点击上传，没有点击上传文件
        alert('请先选择要上传的文件');
        return;
    }

    //6.1开始上传，则让按钮变为不可操作的状态
    handleDisable(true);

    //不同的文件，相同名字，会被替换，所以需要用到sparkMD5插件来编译
    //生成文件的hash名字，再把hash值传给服务器，用来判断是否已存在
    let { filename } = await changeToBuffer(_file);

    /**
     * 把文件传递给服务器的两种格式:
     *  -formData（此处用formData）
     *  -Base64
     * 结合服务端提供的api文档配置请求:（上传成功的文件在服务器端项目的upload文件夹中可以查看）
     * 2.单文件上传处理「FORM-DATA」:由客户端生成文件的名字，传递给服务器处理
        url:/upload_single_name
        method:POST
        params:multipart/form-data
            file:文件对象
            filename:文件名字「自己需要处理成为HASH名字」
        return:application/json
            code:0成功 1失败,
            codeText:状态描述,
            originalFilename:文件原始名称,
            servicePath:文件服务器地址
    */
    let formData = new FormData();
    formData.append('file',_file);
    formData.append('filename',filename);
    //instance是在instance.js文件中通过axios库创建的一个实例对象，进行了二次封装
    instance.post('/upload_single_name',formData).then(data=>{
        //此处data即为response.data，因为已提前在instance配置项中使用axios的拦截器interceptors，帮助我们过滤掉不需要的数据，只留下主体信息data
        if(+data.code === 0){ //code强制转换为number类型
            alert(`上传成功，可在 ${data.servicePath} 中查看 `);
            return;
        }
        return Promise.reject(data.codeText); //返回一个新的Promise对象，状态是rejected，在catch中捕获
    }).catch(reason=>{
        alert('文件上传失败，请稍后再试');
    }).finally(()=>{  //不论成功或者失败，最后都会执行的函数
        //6.2上传结束，恢复按钮的可操作功能
        handleDisable(false);
        upload_abbre.style.display = 'none';
        upload_img.src = '';
        _file = null;
    });

});


})();


//进度管控
(function () {
    //1.获取要用的DOM元素
    let upload = document.querySelector('#upload4'),
    upload_inp = upload.querySelector('.upload_inp'),
    upload_button_select = upload.querySelector('.upload_button.select'),
    upload_progress = upload.querySelector('.upload_progress'),
    upload_progress_value = upload.querySelector('.value');

    //传递element验证是否可操作
    const checkIsDisable = element =>{
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    }
    
    //2.点击选择文件按钮，触发上传文件的input框选择文件的行为
    upload_button_select.addEventListener('click',function(){
        if(checkIsDisable(this)) return;
        upload_inp.click();
    });


    //3.监听用户选择文件的操作
    upload_inp.addEventListener('change',async function(){
        //如何获取用户选中的文件：upload_inp.files，此处为单文件上传,所以只获取数组第一项
        let file = upload_inp.files[0], data;
        if(!file) return;
        upload_button_select.classList.add('loading');
        /**
         * 1.单文件上传处理「FORM-DATA」:由服务器自动生成文件的名字
            url:/upload_single
            method:POST
            params:multipart/form-data
                file:文件对象
                filename:文件名字
            return:application/json
                code:0成功 1失败,
                codeText:状态描述,
                originalFilename:文件原始名称,
                servicePath:文件服务器地址
         */
        try{
            let formData = new FormData();
            formData.append('file',file);
            formData.append('filename',file.name);
            data = await instance.post('/upload_single', formData,{
                onUploadProgress(e){
                    let { loaded, total } = e;
                    upload_progress.style.display = 'block';
                    upload_progress_value.style.width = `${loaded/total*100}%`;
                }
            });
            if(+data.code === 0){
                upload_progress_value.style.width = `100%`;
                //由于alert会限制页面继续渲染，而进度条上有个300ms的延迟渲染效果，所以手动加个300ms的延迟
                await delay(300);
                alert('上传成功');
                return;
            }
            throw data.codeText;
        }catch(err){
            alert('上传失败');
        }finally{
            upload_button_select.classList.remove('loading');
            upload_progress.style.display = 'none';
            upload_progress_value.style.width = `0%`;
        }
    });


})();

//多文件上传
(function () {
    //1.获取要用的DOM元素
    let upload = document.querySelector('#upload5'),
    upload_inp = upload.querySelector('.upload_inp'),
    upload_button_select = upload.querySelector('.upload_button.select'),
    upload_button_upload = upload.querySelector('.upload_button.upload'),
    upload_list = upload.querySelector('.upload_list');
    let _files = [];

    //传递element验证是否可操作
    const checkIsDisable = element =>{
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    }
    
    /**
     * 6.避免用户多次发起请求，类似于防抖，当点击上传后，我们手动调整按钮的状态为loading和disable
    */
     const handleDisable = flag =>{
        if(flag){ //让用户不可操作
            upload_button_select.classList.add('disable');
            upload_button_upload.classList.add('loading');
        }else{  //否则移除样式
            upload_button_select.classList.remove('disable');
            upload_button_upload.classList.remove('loading');
        }
    }

    //2.点击选择文件按钮，触发上传文件的input框选择文件的行为
    upload_button_select.addEventListener('click',function(){
        //7.如果当前按钮处于不可用状态，则不进行后续处理
        if(checkIsDisable(this)) return;
        upload_inp.click();
    });

    //基于事件代理实现移除的操作
    upload_list.addEventListener('click',function(e){
        let target = e.target,
        currentLi = null;
        if(target.tagName === 'EM'){
            currentLi = target.parentNode.parentNode;
            if(!currentLi){
                return;
            }
            key = currentLi.getAttribute('key');
            upload_list.removeChild(currentLi);
            _files = _files.filter(item=>item.key !== key);
            if(_files.length === 0){
                upload_list.style.display = 'none';
            }
        }
    });

    //获取唯一值：通过随机数结合时间戳
    const createRandom = () =>{
        let ran = Math.random() * new Date();
        //转为string去掉小数点
        return ran.toString(16).replace('.','');
    }


    //3.监听用户选择文件的操作
    upload_inp.addEventListener('change',async function(){
        //把类数组集合转成数组集合
        _files = Array.from(upload_inp.files);
        if(_files.length === 0) return;
        //重构集合的数据结构，给每一项加一个唯一值
        _files = _files.map(file=>{
            return {
                file,
                filename: file.name,
                key: createRandom(),
            }
        });
        //绑定数据
        let str = ``;
        _files.forEach((item,index) =>{
            str += `<li key=${item.key}>
            <span>文件${index+1}：${item.filename}</span>
            <span><em>移除</em></span>
            </li>`;
        });
        upload_list.innerHTML = str;
        upload_list.style.display = 'block';
    });


    /**
     * 5.使用axios发请求，上传文件到服务器
    */
   upload_button_upload.addEventListener('click', async function(){
    //8.如果当前按钮处于不可用状态，则不进行后续处理
    if(checkIsDisable(this)) return;
    if(!_files.length === 0){  //直接点击上传，没有点击上传文件
        alert('请先选择要上传的文件');
        return;
    }

    //6.1开始上传，则让按钮变为不可操作的状态
    handleDisable(true);
    //循环发送请求
    let upload_list_arr = Array.from(upload_list.querySelectorAll('li'));
    _files = _files.map(item =>{
        let fm = new FormData,
        curLi = upload_list_arr.find(liBox => liBox.getAttribute('key') === item.key),
        curSpan = curLi?curLi.querySelector('span:nth-last-child(1)') : null;
        fm.append('file',item.file);
        fm.append('filename',item.filename);
        //返回的是一个Promise.all实例
        return instance.post('/upload_single',fm,{
            onUploadProgress(ev){
                //监测每一个文件上传的进度
                if(curSpan){
                    curSpan.innerHTML = `${(ev.loaded/ev.total * 100).toFixed(2)}%`;
                }
            }
        }).then(data=>{
            if(+data.code === 0){
                curSpan.innerHTML = `100%`;
                return;
            }
            return Promise.reject();
        });
    });
    //通过Promise.all()进行操作
    Promise.all(_files).then(()=>{
        alert('所有文件都上传成功')
    }).catch(()=>{
        alert('有文件上传失败');
    }).finally(()=>{
        handleDisable(false);
        _files = [];
        upload_list.innerHTML = '';
        upload_list.style.display = 'none';
    })

    handleDisable(false);
});


})();


//拖拽上传
(function(){
    //1.获取要用的DOM元素
    let upload = document.querySelector('#upload6'),
    upload_inp = upload.querySelector('.upload_inp'),
    upload_submit = upload.querySelector('.upload_submit'),
    upload_mark = upload.querySelector('.upload_mark');
    let isRun = false;

    //实现文件的上传
    const uploadFile = async file =>{
        if(isRun) return;
        isRun = true;
        upload_mark.style.display = 'block';
        try{
            let fm = new FormData,
            data;
            fm.append('file',file);
            fm.append('filename',file.name);
            data = await instance.post('/upload_single',fm);
            if(+data.code === 0){
                alert('上传成功');
                return;
            }
            throw data.codeText;
        }catch(err){
            alert('文件上传失败');
        }finally{
            upload_mark.style.display = 'none';
            isRun = false;
        }
    }

    
    /**
     * 拖拽获取 
     *  dragenter:拖动元素进入容器触发 
     *  dragleave:拖动元素离开容器触发 
     *  dragover：拖动元素在容器中移动时触发
     *  drop：拖动元素放在容器中触发
     */
    upload.addEventListener('dragover',function(ev){
        //阻止浏览器的默认行为：拖拽图片进入时默认变成查看文件
        ev.preventDefault();
    });
    upload.addEventListener('drop',function(ev){
        //阻止浏览器的默认行为：拖拽图片进入时默认变成查看文件
        ev.preventDefault();
        // console.log('放置到容器中');
        let file = ev.dataTransfer.files[0];
        if(!file) return;
        uploadFile(file);
    });

    // 手动选择
    upload_inp.addEventListener('change', function () {
        let file = upload_inp.files[0];
        if (!file) return;
        uploadFile(file);
    });
    upload_submit.addEventListener('click', function () {
        upload_inp.click();
    });

})();


//大文件上传、分片上传、断点续传
(function(){
    //1.获取要用的DOM元素
    let upload = document.querySelector('#upload7'),
    upload_inp = upload.querySelector('.upload_inp'),
    upload_button_select = upload.querySelector('.upload_button.select'),
    upload_progress = upload.querySelector('.upload_progress'),
    upload_progress_value = upload.querySelector('.value');

    //传递element验证是否可操作
    const checkIsDisable = element =>{
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    }

     //file->Buffer
    const changeToBuffer = file =>{
        return new Promise(resolve =>{
            let fileReader = new FileReader();
            //读取成Buffer类型
            fileReader.readAsArrayBuffer(file);
            fileReader.onload = e =>{
                let buffer = e.target.result,
                spark = new SparkMD5.ArrayBuffer(),
                HASH;
                spark.append(buffer);
                HASH = spark.end();  //spark拿到buffer处理成hash
                suffix = /\.([A-z]+)$/.exec(file.name)[1];  //在文件里面获取文件名，即以.xxx结尾的部分
                //最终生成的是hash加上文件名后缀
                resolve({
                    buffer,
                    HASH,
                    suffix,
                    filename: `${HASH}.${suffix}`
                })
            }
        })
    }
    
    //2.点击选择文件按钮，触发上传文件的input框选择文件的行为
    upload_button_select.addEventListener('click',function(){
        if(checkIsDisable(this)) return;
        upload_inp.click();
    });


    //3.监听用户选择文件的操作
    upload_inp.addEventListener('change',async function(){
        //如何获取用户选中的文件：upload_inp.files，此处为单文件上传,所以只获取数组第一项
        let file = upload_inp.files[0];
        if(!file) return;
        upload_button_select.classList.add('loading');
        upload_progress.style.display = 'block';
        //4.获取服务器端已经上传的文件切片
        //拿到文件去获取当前文件的hash值
        let { HASH, suffix } = await changeToBuffer(file);
        let already = [], data = null;
        //获取已经上传的切片信息
        try{
            data  = await instance.get('/upload_already',{
                params:{
                    HASH
                }
            });
            //如果当前文件已经上传过了，则可以获取到已经上传的切片信息
            if(+data.code === 0){
                already = data.fileList;
            }
        }catch(err){} //失败则代表没有上传过

        /**
         * 实现文件的切片处理：
         *  方案一：固定数量  
         *  方案二：固定大小  需要有切片最大值
         *  先以固定大小为主，如果获得的切片数量很大，超过了限制的数量，则转为固定数量
         * */ 
        let max = 1* 1024 * 1024; //每个切片最大1MB
        let count = Math.ceil(file.size / max);  //向上取整，获取切片数量
        if(count > 100){  //如果切片数量超过100个，则设为100个，固定大小和固定数量的结合
            max = file.size / 100;
            count = 100;
        }
        //使用file原型上的slice方法进行切片  file.slice(a,b)：代表从a位置切到b位置
        let index = 0; //初始位置0
        let chunks = [];  //存放所有的切片
        while(index < count){
            /**
             * index为0：0 ~ max
             * index为1：max ~ max+max / max*2
             * index为2: max*2 ~ max*3 
             *           ...
             *           index*max ~ (index+1)*max
             */
            chunks.push({
                file: file.slice(index*max, (index+1)*max),
                filename: `${HASH}_${index+1}.${suffix}`
            })
            index++;
        }

        index = 0; //用来记录已经传了几个切片
        //上传成功的处理
        const complete = async () =>{
            //成功了一个切片，就管控进度条
            index++;
            upload_progress_value.style.width = `${index/count * 100}%`;
            //当所有切片都上传成功，我们发送合并切片的请求
            if(index < count) return;
            upload_progress_value.style.width = `100%`;
            try{
                data = await instance.post('/upload_merge',{
                    HASH,
                    count
                },{
                    headers:{
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                if(+data.code === 0){
                    await delay(300);
                    alert('切片合并成功');
                    clear();
                    return;
                }
                throw data.codeText;
            }catch(err){
                alert('切片合并失败');
                clear();
            }
        }

        //清空
        const clear = () =>{
            upload_button_select.classList.remove('loading');
            upload_progress.style.display = 'none';
            upload_progress_value.style.width = '0%';
        }

        console.log('chunks',chunks);
        //把每个切片都上传到服务器上
        chunks.forEach(chunk=>{
            //已经上传的切片无需再上传
            //already为后端返回的已经上传的切片数据
            if(already.length > 0 && already.includes(chunk.filename)){
                complete(); //另外封装的方法，用来操作进度条，并在全部分片上传完毕后，发起合并分片的请求
                return;
            }
            let fm = new FormData;  //以FormData的数据形式进行上传
            fm.append('file',chunk.file);
            fm.append('filename',chunk.filename);
            //instance为二次封装后的axios
            instance.post('/upload_chunk',fm).then(data=>{
                if(+data.code === 0){
                    //当前切片上传成功
                    complete();
                    return;
                }
                return Promise.reject(data.codeText); //返回一个失败状态的Promise对象
            }).catch(err=>{
                alert('当前切片上传失败');
                clear();  //另外封装的方法，用来处理页面DOM元素的loading状态及进度条状态等
            })
        })
        
    });


})();
