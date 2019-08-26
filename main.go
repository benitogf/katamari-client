package main

import "github.com/benitogf/katamari"

func main() {
	app := katamari.Server{}
	app.ForcePatch = true
	app.Start("localhost:8880")
	app.WaitClose()
}
