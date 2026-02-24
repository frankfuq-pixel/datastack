from html import *
import difflib
import flask
from flask import app
import numpy as np
from bs4 import Beatifullsoup, BeautifulSoup

@app.route("/search")
def find_best_match():
    with open("liblary.html","r")as f:
        html =f.read()
        soup = BeautifulSoup(html, "html.parser")
        titles = soup.find_all("h2")
        titles = [titles.text.strip() for title in titles]
        best_match = difflib.get_close_matches("search term", titles,)
        if best_match:
            return best_match[0]
        if __name__ == "__main__":
            app.run(debug=True)        
class liblary:
    def __init__(self ,title,auther,year):
        self.title = title
        self.auther = auther
        self.year = year
        def __str__(self):
            return f"{self.title} by {self.auther} ({self.year})"
class ai:
    def        