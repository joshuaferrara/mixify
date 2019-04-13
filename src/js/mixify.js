class Mixify {
    constructor(cocktailDb) {
        this.cocktailDb = cocktailDb;
        this.outputH = [];
        this.displayNum = 100;
        this.start = 0;
        this.end = this.start + this.displayNum;
        
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
        this.displayCards();
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
            this.nextPage(1);
            this.generateCards();
            this.displayCards();
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
        this.outputH = [];
        let hashCode = function(s) {
            var h = 0, l = s.length, i = 0;
            if ( l > 0 )
              while (i < l)
                h = (h << 5) - h + s.charCodeAt(i++) | 0;
            if(h < 0)
                h *= -1;
            return h;
          };
        this.outputH[0] = `<div class="container"><div class="row">`;
        this.outputH[1] = `</div></div>`;
        if( this.end > this.filteredCocktails.length) {
          this.end = this.filteredCocktails.length;
        } else if(this.end <= 0) {
          this.end += this.displayNum;
        }
        if(this.start < 0) {
          this.start = 0;
        } else if (this.start >= this.filteredCocktails.length) {
          this.start -= this.displayNum;
        }
        for(let i = this.start; i < this.end; i++) {
          let cocktailData = this.filteredCocktails[i];
            let Cid = hashCode(cocktailData.name);
            let outputHtml = ``;
            let ingredientHtml = ``;
            let ingredientsModal = `<ul>`;
            //OUTPUT MODAL
            let outputModal = `<div class="modal fade" id="t${Cid}" tabindex="-1" role="dialog" aria-labelledby="exampleModalLongTitle" aria-hidden="true">
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
                ingredientsModal += `<li class="">${key}: ${cocktailData.ingredients[key]}</li>`;
            });
            ingredientsModal += `</ul>`;
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
              <a href="#t${Cid}" data-toggle="modal" data-target="#t${Cid}">${cocktailData.name}</a>`;

                  
                  if(alcoholClass == 0) {
                    outputHtml += `<span class="badge badge-secondary float-right">Unknown</span>`;
                    //OUTPUT MODAL
                    outputModal += `secondary float-right">Unknown</span>`;
                  } else {
                    outputHtml += `<span class="badge badge-${alcoholClass} float-right">${cocktailData.alcoholic}</span>`;
                    //OUTPUT MODAL
                    outputModal += `${alcoholClass} float-right">${cocktailData.alcoholic}</span>`;
                  }
                  //OUTPUT MODAL
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
              ${ingredientsModal}
            </div>
          </div>
          <div class="row">
            <div class="col">
              <h5>Instructions:</h5>
              ${cocktailData.instructions}
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
          this.outputH.push(outputHtml);
        }
        
    }
    displayCards() {
        let displayHtml = this.outputH[0];
        for(let i = 2; i < this.displayNum+2; i++)
            displayHtml += this.outputH[i];
        displayHtml +=this.outputH[1];
        $("#cocktailAlbum").html(displayHtml);
    }
    nextPage(pgNum){
      if (pgNum == -1) {
        this.start += this.displayNum;
        this.end += this.displayNum;
      } else if (pgNum == -2) {
        this.start -= this.displayNum;
        this.end -= this.displayNum;
      } else {
        this.end = this.displayNum*pgNum;
        this.start = this.end - this.displayNum;
      }
        this.generateCards();
        this.displayCards();
    }
}

$(document).ready(() => {
    console.log("Loading Mixify...");
    
    $.getJSON("cocktails.json", (data) => {
        let a = new Mixify(data);
        $(".page-item").click(function(){
          let b = $(this).text();
          if(b == "Next") {
            b = -1;
          } else if (b == "Previous") {
            b = -2;
          }
          a.nextPage(b);
        });
    });
    
});