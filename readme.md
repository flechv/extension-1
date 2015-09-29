# Chrome Extension to fetch flights

> Google Chrome Extension that searches flights for multiples filters given by the user, such as multiple origin and destination cities, multiple dates, number of adults, children and infants. It also can send an email in case of finding fares under a given price and can save a CSV file with found prices.


## Getting Started

To test the extension locally, go to chrome://extensions, enable Developer mode and load app as an unpacked extension (select the extension folder). Then, it'll load the configuration file manifest.json and the extension should appear.

If you need more information about Google Chrome Extension, please visit [Google Chrome Extension Developer's Guide](http://developer.chrome.com/extensions/devguide.html).


## Building

Install dependencies

```
git must be on your path.  If you can't do the command 'git' from your terminal, then install git first and make sure you have access from the path. Then make sure you have installed both npm, bower and gulp since we're these.

> npm install
> bower install
```

After downloading dependencies, you need to build the repository to create folder dist (distribution):

```
> gulp build (or gulp watch to build and watch for modifications to rebuild automatically)
```

## Issues

If you find an issue, feel free to report it on [issues](https://github.com/brenovieira/extensao/issues/new) or just email me at genghislabs@gmail.com.


## Contribute

We're gonna be happy with any contribution, either giving a feedback, reporting an issue or developing more features.


## TODO list

To evolve this app, there are several features that I already thought, such as:

- Save prices found on database to show all prices found by everyone
- Add other known flight engines, for example, skyscanner or kayak
- Add locales for other countries
- Add other loyalt programs as Advantage (American Airlines), Executive Club (British Airways), Victoria (TAP), ...
- Add feature to search different flight legs in same ticket, known as multi cities (A -> B and C -> A or A -> B, B -> C, C -> A)
- Add hotels booking

These are just the ones I thought, but you can help gather other useful features.