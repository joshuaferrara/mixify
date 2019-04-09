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
        
        // TODO: Select random n-cocktails to display
        //       when no search terms are provided.
        this.defaultCocktails = Object.values(this.cocktailDb.cocktails);
        Object.freeze(this.defaultCocktails);

        this.filteredCocktails = this.defaultCocktails;

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
            // Cancel the item add if the ingredient the user is trying to add
            // does not exists in our ingredient database.
            event.cancel = this.cocktailDb.ingredients.indexOf(event.item) == -1;
        });

        let tagInputChangeEventHandler = () => {
            this.filterCards();
            this.sortCards();
            this.generateCards();
        }

        $('input').on('itemAdded', tagInputChangeEventHandler);
        $('input').on('itemRemoved', tagInputChangeEventHandler);
    }

    get selectedIngredients() {
        return this.searchIngredients.itemsArray.map((ingr) => ingr.toLowerCase());
    }

    filterCards() {
        const selectedIngredients = this.selectedIngredients;
        if (selectedIngredients.length == 0) {
            this.filteredCocktails = this.defaultCocktails;
        } else {
            this.filteredCocktails = Object.values(this.cocktailDb.cocktails).filter((cocktail) => {
                return selectedIngredients.some((ingredient) => 
                                                 Object.keys(cocktail.ingredients).map((ingr) => ingr.toLowerCase()).includes(ingredient));
            });
        }
    }

    sortCards() {
        // TODO: sort cards in decreasing order based upon
        //       number of ingredients user has out of 
        //       total number of ingredients for that drink
        //       Also, sort the ingredients in each cocktail
        //       so that ingredients we have are rendered b4
        //       ingredients we don't have.

        console.warn("TODO: sort the cards");
    }

    // Generates list of cards
    generateCards() {
        let outputHtml = `<div class="container"><div class="row">`;
        this.filteredCocktails.forEach((cocktailData) => {
            let ingredientHtml = ``;
            let outputModal = `<div class="modal fade" id="${cocktailData.name.split(" ")}" tabindex="-1" role="dialog" aria-labelledby="exampleModalLongTitle" aria-hidden="true">
            <div class="modal-dialog modal-lg" role="document">
              <div class="modal-content">
                <div class="modal-header">
                    <div class="container">
                      <div class="row">
                        <div class="col">
                            <h5 class="modal-title">${cocktailData.name}<span class="badge badge-`;
            Object.keys(cocktailData.ingredients).forEach((key) => {
                let hasIngredientClass = (this.selectedIngredients.indexOf(key.toLowerCase()) != -1 ? "success" : "primary");

                ingredientHtml += `<span class="badge badge-${hasIngredientClass} m-1">${key}</span>`;
            });

            let alcoholClass = 0;
            if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Optional') != -1) {
                alcoholClass = "warning";
            } else if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Non') != -1) {
                alcoholClass = "danger";
            } else if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Alcoholic') != -1) {
                alcoholClass = "success";
            }

            // TODO: some cocktail objects don't have the `alcoholic`
            //       property. For these cases, we might wanna set
            //       the alcoholic property to a question mark or
            //       something.
            
            outputHtml += `<div class="col-lg-3">
            <div class="card mb-4 shadow-sm">
              <img class="bd-placeholder-img card-img-top" src="${cocktailData.thumbnail}" focusable="false" role="img" aria-label="Placeholder: Thumbnail"></img>
              <div class="card-body">
                  <a href="#${cocktailData.name.split(" ")}" data-toggle="modal" data-target="#${cocktailData.name.split(" ")}">${cocktailData.name}</a>`;

                  
                  if(alcoholClass == 0) {
                    outputHtml += `<span class="badge badge-secondary float-right">Unknown</span>`;
                    outputModal += `secondary float-right">Unknown</span>`;
                  } else {
                    outputHtml += `<span class="badge badge-${alcoholClass} float-right">${cocktailData.alcoholic}</span>`;
                    outputModal += `${alcoholClass} float-right">${cocktailData.alcoholic}</span>`;
                  }
                  outputModal += `</h5>
                  
          </div>
          <div class="col">
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
          </div>
        </div>
      </div>
      </div>
      <div class="modal-body">
        <div class="container">
          <div class="row">
            <div class="col">
                <img class="bd-placeholder-img card-img-top" src="${cocktailData.thumbnail}" focusable="false" role="img" aria-label="Placeholder: Thumbnail"></img>
            </div>
            <div class="col">
              <h5>List of ingredients:</h5>
              ${ingredientHtml}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;
                  outputHtml += `</p>
                  <div>
                    ${ingredientHtml}
                  </div>
              </div>
            </div>
          </div>${outputModal}`;
          
        });
        console.log(this.filteredCocktails);
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

