function showpass() {
    var ele = document.getElementById("password");
    (ele.type === "password")? ele.type = "text" : ele.type = "password"
}

  
function dropDown() {
    let element = document.querySelector(".dropdown");
    element.style.display = element.style.display === 'none' ? 'block' : 'none';
 }
