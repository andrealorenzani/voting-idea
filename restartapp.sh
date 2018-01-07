# ps -ef | grep "sudo node app.js" | grep -v grep | awk '{print $2}' | xargs kill
sudo ps -ef | grep "sudo node" | grep -v grep | awk '{print $2}' | xargs sudo kill
sudo node app.js &
sudo node static/app.js &