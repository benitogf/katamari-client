package main

import "github.com/benitogf/samo"

func main() {
	app := samo.Server{}
	app.Start("localhost:8880")
	app.WaitClose()
}
