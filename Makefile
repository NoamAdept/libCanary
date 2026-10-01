.PHONY: game serve clean

game serve:
	@echo "CANARY MINE → http://localhost:8080"
	python3 -m http.server 8080 --directory game

clean:
	@true
