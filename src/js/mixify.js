class Mixify {
    constructor(cocktailDb) {
        this.cocktailDb = cocktailDb;
        Object.freeze(this.cocktailDb);
        /* 
            this.cocktailDb = {
                cocktails: [
                    0: {

                    }
                ],

                ingredients: [
                    "Whiskey",
                    "Vodka"
                ]
            }
        */

        this.filteredCocktails = Object.values(this.cocktailDb.cocktails);

        this.initializeSearchBar();
        this.generateCards();

        console.log(`Loaded Mixify with ${Object.keys(this.filteredCocktails).length} drinks.`);
    }

    // Sets up the search bar tagging stuff
    initializeSearchBar() {
        var ingredientNames = new Bloodhound({
            local: this.cocktailDb.ingredients,
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            datumTokenizer: Bloodhound.tokenizers.whitespace
        });
        ingredientNames.initialize();

        this.searchIngredients = $('input').tagsinput({
            typeaheadjs: {
              source: ingredientNames
            }
        })[0];

        $('input').on('beforeItemAdd', (event) => {
            // Only let users add items that are available through auto complete
            event.cancel = this.cocktailDb.ingredients.indexOf(event.item) == -1;
        });

        $('input').on('itemAdded', (event) => {
            this.filterCards();
            this.generateCards();
        });
        
        $('input').on('itemRemoved', (event) => {
            this.filterCards();
            this.generateCards();
        });
    }

    filterCards() {
        const selectedIngredients = this.searchIngredients.itemsArray.map((ingr) => ingr.toLowerCase());
        console.log(selectedIngredients)
        if (selectedIngredients.length == 0) {
            this.filteredCocktails = Object.values(this.cocktailDb.cocktails);
        } else {
            this.filteredCocktails = Object.values(this.cocktailDb.cocktails).filter((cocktail) => {
                return selectedIngredients.some((ingredient) => 
                                                 Object.keys(cocktail.ingredients).map((ingr) => ingr.toLowerCase()).includes(ingredient));
            });
        }
    }

    // Generates list of cards
    generateCards() {
        let outputHtml = `<div class="container"><div class="row">`;
        this.filteredCocktails.forEach((cocktailData) => {
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
    }
}

$(document).ready(() => {
    console.log("Loading Mixify...");

    $.getJSON("cocktails.json", (data) => {
        new Mixify(data);
    });
});

