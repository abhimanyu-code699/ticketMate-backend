exports.generateRandomCode = async() =>{
    const character = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = "";
    const length = 6;
    
    for(let i = 0;i<length;i++){
        code += character.charAt(Math.floor(Math.random()*character.length))
    }
    return code;
}