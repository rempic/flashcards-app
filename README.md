
Run 

    cd ... 

    python3 -m http.server 8000

    open http://localhost:8000


KILL:
    lsof -i :8000
    pkill -f "python3 -m http.server"
    kill 57255
    lsof -i :8000