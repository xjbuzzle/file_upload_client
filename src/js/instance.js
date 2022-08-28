let instance = axios.create();
//把常用的ip+端口提取出来
instance.defaults.baseURL = 'http://127.0.0.1:8888';
//把常用的请求头数据格式提取出来
instance.defaults.headers['Content-Type'] = 'multipart/form-data';
//如果请求是特别配置的，数据格式为application/x-www-form-urlencoded的话，就返回处理后的data，否则正常返回
instance.defaults.transformRequest = (data, headers)=>{
    const contentType = headers['Content-Type'];
    if(contentType === 'application/x-www-form-urlencoded') return Qs.stringify(data);
    return data;
}
//axios的拦截器
instance.interceptors.response.use(response=>{
    return response.data;
});
