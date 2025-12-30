"""
Data source scrapers.
"""

from scraper.sources.nse import NSEOptionsScraper
from scraper.sources.bse import BSEOptionsScraper

__all__ = ["NSEOptionsScraper", "BSEOptionsScraper"]
