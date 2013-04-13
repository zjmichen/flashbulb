$(document).ready(function() {
    var ctx = document.getElementById("editor").getContext("2d"),
        height = $("#editor img").height(),
        width = $("#editor img").width(),
        img = new Image();

    img.src = "/photos" + $("#editor img").attr("src");
    img.onload = function() {
        width = img.width;
        height = img.height;

        // x-pro filter
        var gradWidth = width,
            gradHeight = height;
        var xpro = ctx.createRadialGradient(gradWidth/2, gradHeight/2, 0, gradWidth/2, gradHeight/2, Math.min(gradWidth, gradHeight));
        xpro.addColorStop(0, "rgba(0, 0, 0, 0)");
        xpro.addColorStop(0.5, "rgba(0, 0, 0, 0.2");
        xpro.addColorStop(0.7, "rgba(0, 0, 0, 0.5");
        xpro.addColorStop(1, "rgba(0, 0, 0, 1)");

        // scale canvas to image size
        $("#editor").attr("width", width);
        $("#editor").attr("height", height);
        ctx.drawImage(img, 0, 0);

        ctx.fillStyle = xpro;
        ctx.fillRect(0, 0, width, height);
    };


    $(".save").click(function(e) {
        e.preventDefault();
    });
});
