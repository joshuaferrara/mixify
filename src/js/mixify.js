class Mixify {
    constructor(cocktailDb) {
        this.cocktailDb = cocktailDb;
        /* 
            this.cocktailDb = {
                cocktails: [
                    {

                    }
                ],

                ingredients: [
                    "Whiskey",
                    "Vodka"
                ]
            }
        */

        this.filteredCocktails = this.cocktailDb.cocktails;

        this.initializeSearchBar();
        this.generateCards();

        console.log(`Loaded Mixify with ${this.filteredCocktails.length} drinks.`);
    }

    // Sets up the search bar tagging stuff
    initializeSearchBar() {
        var ingredientNames = new Bloodhound({
            local: this.cocktailDb.ingredients,
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            datumTokenizer: Bloodhound.tokenizers.whitespace
        });
        ingredientNames.initialize();

        $('input').tagsinput({
            typeaheadjs: {
              source: ingredientNames
            }
        });

        // TODO: listen for changes on input and filter out & rerender cards
    }

    // Generates list of cards
    generateCards() {
        // TODO: Jonathan - generate HTML for all cards
        // iterate through this.filteredCocktails to display cocktails
        console.log(this.filteredCocktails);

        let outputHtml = `<div class="container"><div class="row">`;
        Object.keys(this.filteredCocktails).forEach((key) => {
            const cocktailData = this.filteredCocktails[key];
            let ingredientHtml = ``;
            Object.keys(cocktailData.ingredients).forEach((key) => {
                ingredientHtml += `<span class="badge badge-primary">${key}</span>`;
            });            
            outputHtml += `<div class="col-lg-3">
            <div class="card mb-4 shadow-sm">
              <img class="bd-placeholder-img card-img-top" src="${cocktailData.thumbnail}" focusable="false" role="img" aria-label="Placeholder: Thumbnail"></img>
              <div class="card-body">
                  <p class="card-text">${cocktailData.name} <span class="badge badge-success">Alcoholic</span></p>
                  <div>
                    ${ingredientHtml}
                  </div>
              </div>
            </div>
          </div>`;
        });
        outputHtml += `</div></div>`;
        $("#cocktailAlbum").html(outputHtml);

        //document.getElementsById("pracc").innerHTML = this.filteredCocktails[0].name;
    }
}

$(document).ready(() => {
    console.log("Loading Mixify...");

    $.getJSON("cocktails.json", (data) => {
        new Mixify(data);
    });
});

