/*******************************************************************************
* C interface to PGMLAB
*    USAGE:
*        pgmlab [--help] [--learning] [--inference]
* 
*******************************************************************************/
//for inimini
#include <assert.h>
#include <stdio.h>
#include <stdlib.h> // for strtod
#include <string.h>
#define sizearray(a)  (sizeof(a) / sizeof((a)[0]))

//for checking to see if file is readable
#include <unistd.h>

//To handle tilda 
#include <wordexp.h>

//for basename
#include <libgen.h>

//for isbool to check if int
#include <ctype.h>

//readline
#include <readline/readline.h>
#include <readline/history.h>

#include "net.h"
#include "main.h"

#include "../include/argtable3.h"

#define TRUE		1
#define	FALSE		0
#define FILENAME_MAX	100

//dealing with directories
#include <dirent.h>

//From: http://forums.devshed.com/programming-42/remove-slash-string-211736.html
int remove_trailing_slash(char **source) {
    size_t len = strlen(*source);
    if((len > 0) && ((*source)[len-1] == '/'))
        (*source)[len-1] = '\0';

   return 0;
}

//this checks if the directory is writalbe and the filename exists
int is_writeable(char * filepath) {
    if( ( strlen(filepath) == 0) || (strcmp(filepath, ".") == 0) || (strcmp(filepath, "/") ==0) ) {
         return FALSE;
    }
    char buf[1000];
    realpath(filepath, buf); // buff should now be full filepath
    char *ts = strdup(buf);
    char *ts2 = strdup(filepath);
    char *filename = basename(buf);
    char *dir = (char *) dirname(buf);

    if ( (access(dir, W_OK) == 0) && (strlen(filename) > 0)) {
        return TRUE;
    }
    
    return FALSE;
}    

int analyze_network_directory(char *network_dir_name, char *data_dir, int em_max_iterations, double em_log_likelihood_change_limit, double em_parameters_change_limit, int number_of_states, int verbose, int map) {
    int network_dir_len = strlen(data_dir) + strlen(network_dir_name) + 3;//3 = zero-terminator and slashs
    char *network_dir = malloc(network_dir_len);
    strcpy(network_dir, data_dir);
    strcat(network_dir, "/");
    strcat(network_dir, network_dir_name);
    strcat(network_dir, "/");

    DIR  *subdir;
    if (((access((network_dir), W_OK) != 0 )) || ((subdir = opendir((network_dir))) == NULL)) {
        printf("ERROR: directory %s is not writeable / was not able to open\n", network_dir_name);
        return 1;
    }
    int pi_str_len = strlen(network_dir_name) + network_dir_len + 4; // 4 = file extension .pi and zero-terminator
    char *pi_file = malloc(pi_str_len);
    strcpy(pi_file, network_dir);
    strcat(pi_file, network_dir_name);
    strcat(pi_file, ".pi");

    char * logical_fg_file = malloc(network_dir_len + 11);// 11 = zero-terminator + length filename
    strcpy(logical_fg_file, network_dir);
    strcat(logical_fg_file, "logical.fg");

    char * learning_obs_file = malloc(network_dir_len + 13);
    strcpy(learning_obs_file, network_dir);
    strcat(learning_obs_file, "learning.obs");

    char *learnt_fg_file = malloc(network_dir_len + 10); 
    strcpy(learnt_fg_file, network_dir);
    strcat(learnt_fg_file, "learnt.fg");

    char *inference_obs_file = malloc(network_dir_len + 14);
    strcpy(inference_obs_file, network_dir);
    strcat(inference_obs_file, "inference.obs");

    char *pp_file = malloc(pi_str_len);// happens to be same length as pi file
    strcpy(pp_file, network_dir);
    strcat(pp_file, network_dir_name);
    strcat(pp_file, ".pp");

    int pi_exists = 0,
        logical_fg_exists = 0,
        learning_obs_exists = 0,
        learnt_fg_exists = 0,
        inference_obs_exists = 0,
        pp_exists = 0;

    struct dirent *subent;
    while((subent = readdir(subdir)) != NULL) {
        if ((strcmp(".", (subent->d_name)) == 0) || (strcmp("..", subent->d_name) == 0 )) continue;

        char *dot = strrchr(subent->d_name, '.');
        if (dot && !strcmp(dot, ".pi")) {
            pi_exists = 1; 
        }
        else if (!strcmp(dot, ".pp")) {
            pp_exists = 1;
        }
        else if (!strcmp(subent->d_name, "logical.fg")) {
            logical_fg_exists = 1;
        }
        else if (!strcmp(subent->d_name, "learning.obs")) {
            learning_obs_exists = 1;
        }
        else if (!strcmp(subent->d_name, "learnt.fg")) {
            learnt_fg_exists = 1;
        }
        else if (!strcmp(subent->d_name, "inference.obs")) {
            inference_obs_exists = 1;
        }
    }
    
    if (!(pi_exists == 1 )) {
        if (verbose == 1) {
            printf("\t\t\tSKIPPING: unable to find pairwise interaction file (should have same name as subdirectory with the extension pi\n"); 
        }
        return 0;
    }

    if (!logical_fg_exists) {
        int exit_code = reaction_logic_to_factorgraph(pi_file, logical_fg_file, number_of_states);
        if (exit_code != 0) {
            char * strerr = strerror(exit_code);
            printf("ERROR: Failed to generate factorgraph %s (error code: %d): %s\n", logical_fg_file, exit_code, strerr);
        } 
        else {
            logical_fg_exists = 1;
            printf("\t\t\tlogical.fg has been generated\n");
        }
    } 

    if ((learnt_fg_exists == 0) && ( learning_obs_exists == 1) && ( logical_fg_exists ==1)) {
        if (verbose == 1 ) {
            printf("\t\t\tPerforming learning\n");
        }
 
        int exit_code = learning_discrete_BayNet(pi_file, logical_fg_file, learning_obs_file, learnt_fg_file, number_of_states, em_max_iterations, em_log_likelihood_change_limit, em_parameters_change_limit, map, 0);
        if (exit_code != 0) {
            char * strerr = strerror_pgmlab(exit_code);
            printf("Learning failed (error code: %d): %s\n", exit_code, *strerr);
        } 
        else {
            learnt_fg_exists = 1;
            if (verbose == 1) {
                printf("\t\t\tlearnt.fg has been generaged\n");
            }
        }
    }
    else if (verbose == 1) {
        printf("\t\t\tSkipping learning: Either learnt.fg and/or learning.obs does not exit or learnt.fg has already been generated\n"); 
    }
    if((pp_exists == 0) && ( inference_obs_exists == 1 )) {
        if (verbose == 1) {
             printf("\t\t\tPerforming inference\n");
        }

        int exit_code = 0;
        if(learnt_fg_exists == 1) {
             if (verbose == 1) {
                  printf("\t\t\t\tUsing learnt.fg and inference.obs (pgmlab uses learnt fg if it has been generated)\n");         
             }
             exit_code = doLBPinference(pi_file, learnt_fg_file, inference_obs_file, pp_file, number_of_states);
        } 
        else if (logical_fg_exists == 1) {
             if (verbose == 1) {
                  printf("\t\t\t\tUsing logical.fg and inference.obs\n");         
             }
             exit_code = doLBPinference(pi_file, logical_fg_file, inference_obs_file, pp_file, number_of_states);
        }

        if (exit_code != 0) {
            char * strerr = strerror_pgmlab(exit_code);
            printf("Inference failed with (error code: %d): %s\n", exit_code, *strerr);
        } 
        else if (verbose == 1) {
            printf("\t\t\tPosterior probability file has been generaged\n");
        }
    }
    else if (verbose == 1) {
        printf("\t\t\tSkipping inference because there isn't a inference.obs file available or because the posterior probability file has already been generated\n");
    }


    free(pi_file);
    free(logical_fg_file);
    free(learning_obs_file);
    free(learnt_fg_file);
    free(inference_obs_file);
    free(pp_file);
    free(network_dir);

    return 1;
}

int analyze_directory( char *data_dir, int em_max_iterations, double em_log_likelihood_change_limit, double em_parameters_change_limit, int number_of_states, int verbose, int map) {
    DIR *dir;
    if ((access(data_dir, W_OK) != 0) || ((dir = opendir(data_dir)) == NULL)) {
        printf("ERROR: Make sure your data-dir (%s) flag is a path to a writable directory\n", data_dir);
        return 1;
    }

    if(verbose == 1) {
        printf("\tStarting to analyze each sub directory found in: %s\n", data_dir);
    }

    int exit_code;
    struct dirent *ent;
    while ((ent = readdir(dir)) != NULL) {
        if ((strcmp(".", (ent->d_name)) == 0) || (strcmp("..", ent->d_name) == 0 )) continue;

        if (verbose == 1) {
             printf("\t\tAnlyzing sub-directory: %s\n", ent->d_name);
        } 

        int exit_code = analyze_network_directory(&ent->d_name, data_dir, em_max_iterations, em_log_likelihood_change_limit, em_parameters_change_limit, number_of_states, verbose, map);
        if (exit_code !=0) {
           return exit_code;
        }
    }
    closedir(dir);

    return 0;
}

int non_interactive_command(int em_max_iterations, double em_log_likelihood_change_limit, double em_parameters_change_limit, int number_of_states, char *pairwise_interactions_filepath, char *logical_factorgraph_filepath, char* estimated_parameters_filepath, char *learning_observed_data_filepath, char* inference_factorgraph_filepath, char *inference_observed_data_filepath, char* posterior_probabilities_filepath, int g_count, int l_count, int i_count, int logging, int MAP_flag) {

    if (g_count > 0) {
        printf("Generating factorgraph with:\n\t\tnumber of states\t%d\n", number_of_states);

        if ( is_writeable(logical_factorgraph_filepath) == 0)  {
            printf("Pathway filepath not specified correctly\n");
            return 1;
        }
        if (access(pairwise_interactions_filepath, R_OK)) {
            printf("Pairwise interactions filepath not specified correctly\n");
            return 1;
        }
        int exit_code = reaction_logic_to_factorgraph(pairwise_interactions_filepath, logical_factorgraph_filepath, number_of_states);

        if (exit_code != 0) {
           char * strerr = strerror(exit_code);
           printf("Failed to generate factorgraph (error code: %d): %s\n", exit_code, strerr);
           return exit_code;
        }
        else {
           printf("\tFactorgragh has been printed out into the following file: %s\n", logical_factorgraph_filepath); 
           printf("\tFactorgraph generation completed\n\n");
        }
    }
    if (l_count > 0) {
        printf("Running Learning with:\n\t\tMax iterations\t\t\t%d\n\t\tnumber of states\t\t%d\n\t\tlog likelilhood change limit\t%f\n\t\tparameters change limit\t\t%f\n", em_max_iterations, number_of_states, em_log_likelihood_change_limit, em_parameters_change_limit);
        if (logging == 1 ) {
            printf("\t\tlogging\t\t\t\ton\n");
        }
        else {
            printf("\t\tlogging\t\t\t\toff\n");
        }
        if (MAP_flag == 1) {
            printf("\t\tMAP\t\t\t\ton\n");
        }
        else {
            printf("\t\tMAP\t\t\t\toff\n");
        }

        if ( access(logical_factorgraph_filepath, R_OK)){
            printf("Logic factorgraph filepath not specified correctly\n");
            return 1;
        }
        if ( access(learning_observed_data_filepath, R_OK) ) {
            printf("Learning observed data filepath not specified correctly\n");
            return 1;
        }
        if ( is_writeable(estimated_parameters_filepath) == 0  ) {
            printf("Estimated Parameters filepath not specified correctly\n");
            return 1;
        }
        if ( access(pairwise_interactions_filepath, R_OK) ) {
            printf("Pairwise interactions filepath not specified correctly\n");
            return 1;
        }

        int exit_code = learning_discrete_BayNet(pairwise_interactions_filepath, logical_factorgraph_filepath, learning_observed_data_filepath, estimated_parameters_filepath, number_of_states, em_max_iterations, em_log_likelihood_change_limit, em_parameters_change_limit, MAP_flag, logging);
        if (exit_code != 0) {
            char * strerr = strerror_pgmlab(exit_code);
            printf("Learning failed (error code: %d): %s\n", exit_code, *strerr);
            return 0;
        } 
        else {
            printf("\tEstimated Parameters (learnt factorgraph) have been written to: %s\n", estimated_parameters_filepath);
            printf("\tLearning completed\n\n");
        }
    }
    if (i_count > 0) {
        printf("Running Inference with:\n\t\tnumber of states\t%d\n", number_of_states);
        if ( access(inference_observed_data_filepath, R_OK) ){
            printf("Observed data filepath not specified correctly\n");
            return 1;
        }
        if ( is_writeable(posterior_probabilities_filepath) == 0) {
            printf("Posterior probabilities filepath not specified correctly\n");
            return 1;
        }
        if ( access(pairwise_interactions_filepath, R_OK) ) {
            printf("Pairwise interactions filepath not specified correctly\n");
            return 1;
        }

        int exit_code;
        if ( access(inference_factorgraph_filepath, R_OK) ) {
            printf("Inference factorgraph filepath not specified correctly\n");
            return 1;
        }

        exit_code = doLBPinference(pairwise_interactions_filepath, inference_factorgraph_filepath, inference_observed_data_filepath, posterior_probabilities_filepath, number_of_states);
        if (exit_code != 0) {
             char * strerr = strerror_pgmlab(exit_code);
             printf("Inference failed with (error code: %d): %s\n", exit_code, *strerr);
             return exit_code;
        }
        else {
             printf("\tPosterior probabilities have been written to the following file: %s\n", posterior_probabilities_filepath);
             printf("\tInference completed\n");
        }
    }
    return 0;
}

void trimwhitespace(char ** s) {
    char * p = *s;
    int l = strlen(p);

    while(isspace(p[l - 1])) p[--l] = 0;
    while(* p && isspace(* p)) ++p, --l;
    memmove(*s, p, l + 1);
}

// Mainly used to expand tilda at beginning of filepath
void expand_path (char** path) {
 
    wordexp_t exp_result;
    wordexp(*path, &exp_result, 0);
 
    *path = (char*) exp_result.we_wordv[0];
 //   wordfree(&exp_result);  // freeing the variable causes errors at the beggining of the path variable
}

void clean_filepath(char**path) {
    trimwhitespace(path);
    expand_path(path);
}

// Returns 1 for true an 0 for false
int is_yes(char * input) {
    if((strcmp(input,"yes") == 0) ||
       (strcmp(input,"YES") == 0) ||
       (strcmp(input,"Y") == 0) ||
       (strcmp(input,"y") == 0) ||
       (strcmp(input,"") == 0))
    {
        return TRUE;
    }

    return FALSE;
}

int get_readable_pairwise_interaction_filepath(char ** filepath) {
    *filepath = readline("\tEnter pairwise interaction filepath (input):  ");
    clean_filepath(filepath);
    add_history(*filepath);

    if (access(*filepath, R_OK) != 0) {
       printf("\t\tCan not read specified file.\n");
       return get_readable_pairwise_interaction_filepath(filepath);
    }

    return 0;
}

int get_writeable_logical_factorgraph_filepath(char ** filepath) {
    *filepath = readline("\tEnter factorgraph filepath (output):  ");
    clean_filepath(filepath);
    add_history(*filepath);

    if (!is_writeable(*filepath)) {
       printf("\t\tCan not write specified file.\n");
       return get_writeable_logical_factorgraph_filepath(filepath);
    }

    return 0;
}

int get_readable_logical_factorgraph_filepath(char ** filepath) {
    *filepath = readline("\tEnter factorgraph filepath (input):  ");
    clean_filepath(filepath);
    add_history(*filepath);

    if (access(*filepath, R_OK) != 0) {
       printf("\t\tCan not read specified file.\n");
       return get_readable_logical_factorgraph_filepath(filepath);
    }

    return 0;
}


int get_readable_factorgraph_filepath(char ** filepath) {
    *filepath = readline("\tEnter factorgraph filepath (input):  ");
    clean_filepath(filepath);
    add_history(*filepath);

    if (access(*filepath, R_OK) != 0) {
       printf("\t\tCan not read specified file.\n");
       return get_readable_factorgraph_filepath(filepath);
    }

    return 0;
}

int get_number_of_states(int * number_of_states) {
    char * ptr;
    char *str = "";
    str = readline("\tEnter number of states [default 2]: ");

    if (!*str) {
        *number_of_states = 2;
        return 0;
    }
   
    int number = strtol(str, &ptr, 10);
    if (number == 0 && *str != '0') {
        printf("\t\tNot a valid Integer - please try again");
        return get_number_of_states(number_of_states); 
    }
    else {
        *number_of_states = number;
    }

    return 0;
}

int get_observed_data_filepath(char ** filepath) {
    *filepath = readline("\tEnter observed data filepath (input):  ");
    clean_filepath(filepath);
    add_history(*filepath);

    if (access(*filepath, R_OK) != 0) { 
       printf("\t\tCan not read specified file.\n");
       return get_observed_data_filepath(filepath);
    }

    return 0;
}

int get_writeable_posterior_probabilities_filepath(char ** filepath) {
    *filepath = readline("\tEnter posterior probabilities filepath (output):  ");
    clean_filepath(filepath);
    add_history(*filepath);

    if (!is_writeable(*filepath)) {
       printf("\t\tCan not write to specified file.\n");
       return get_writeable_posterior_probabilities_filepath(filepath);
    }

    return 0;
}

int get_writeable_estimated_parameters_filepath(char ** filepath) {
    *filepath = readline("\tEnter estimated parameters filepath (output):  ");
    clean_filepath(filepath);
    add_history(*filepath);

    if (!is_writeable(*filepath)) { 
       printf("\t\tCan not read specified file.\n");
       return get_writeable_estimated_parameters_filepath(filepath);
    }

    return 0;
}

int get_max_iterations(int * em_max_iterations) {
    char *ptr;
    char *str = "";
    str = readline("\tEnter max number of iterations for EM [default 400]: ");

    if (!*str) {
        *em_max_iterations = 400;
        return 0;
    }

    int number = strtol(str, &ptr, 10);
    if (number == 0) {
        printf("\t\tNot a valid Integer - please try again");
        return get_max_iterations(em_max_iterations); 
    }
    else {
        *em_max_iterations = number;
    }

    return 0;
}

int get_log_likelihood_change_limit(double * em_log_likelihood_change_limit) {
    char *ptr;
    char *str = "";
    str = readline("\tEnter the stop criterion log likelihood change limit [default 1e-5]: ");
 
    if (!*str) {
        *em_log_likelihood_change_limit = 1e-5;
        return 0;
    }

    double number = strtod(str, &ptr);
    if (number == 0) {
        printf("\t\tNot a valid number");
        return get_log_likelihood_change_limit(em_log_likelihood_change_limit); 
    }
    else {
        *em_log_likelihood_change_limit = number;
    }

    return 0;
}


int get_parameters_change_limit(double * em_parameters_change_limit) {
    char *ptr;
    char *str = "";
    str = readline("\tEnter the stop criterion parameters change limit [default 1e-3]: ");
 
    if (!*str) {
        *em_parameters_change_limit = 1e-3;
        return 0;
    }

    double number = strtod(str, &ptr);
    if (number == 0) {
        printf("\t\tNot a valid number");
        return get_parameters_change_limit(em_parameters_change_limit); 
    }
    else {
        *em_parameters_change_limit = number;
    }

    return 0;
}

int get_learning_logging(int *logging) {
    char *input = readline("\tWould you like to have a log be generated for monitoring progress. If yes a \"file.log\" will be generated. [Y/n]  ");
    
    *logging = is_yes(input) == 1 ? 1 : 0;

    return 0;
}

int get_map_flag(int * map_flag) {
    char *str = "";
    str = readline("\tEnter map flag (1 or 0) [default 1]: ");

    if ((!*str) || (*str == '1')) {
        *map_flag = 1;
    }
    else if (*str == '0') {
        *map_flag = 0;
    }
    else {
        printf("\t\tNot 0 or 1 - please try again\n");
        return get_map_flag(map_flag); 
    }

    return 0;
}

int interactive_pairwise_to_factorgraph(char **pairwise_interactions_filepath, char **factorgraph_filepath, int *number_of_states) {
    printf("\nGathering information required to generated the factorgraph file from pairwise interactions\n");
    get_readable_pairwise_interaction_filepath(pairwise_interactions_filepath);
    get_writeable_logical_factorgraph_filepath(factorgraph_filepath);
    get_number_of_states(number_of_states);

    printf("\nGenerating a factorgraph from pairwise interactions:\t%s\n", *factorgraph_filepath);
    int exit_code = reaction_logic_to_factorgraph(*pairwise_interactions_filepath, *factorgraph_filepath, *number_of_states);

    if (exit_code != 0) {
        char * strerr = strerror_pgmlab(exit_code);
        printf("Failed to generate factorgraph (error code: %d): %s\n", exit_code, strerr);
        return exit_code;
    }
    else {
        printf("\tFactorgragh has been output into the following factorgraph file: %s\n", *factorgraph_filepath);
        printf("\tFactorgraph generation completed\n\n");
    }
}

int interactive_learning(char **pairwise_interactions_filepath, char **logical_factorgraph_filepath, char ** observed_data_filepath, char** estimated_parameters_filepath, int *number_of_states, int * em_max_iterations, double * em_log_likelihood_change_limit, double * em_parameters_change_limit, int * MAP_flag, int * logging ) {
    printf("\nGathering information required to perform learning\n");
    if (access(*pairwise_interactions_filepath, R_OK) != 0)
        get_readable_pairwise_interaction_filepath(pairwise_interactions_filepath);
    if (access(*logical_factorgraph_filepath, R_OK) != 0) 
        get_readable_logical_factorgraph_filepath(logical_factorgraph_filepath);
    get_observed_data_filepath(observed_data_filepath);
    get_writeable_estimated_parameters_filepath(estimated_parameters_filepath);
    get_learning_logging(logging);
    if (*number_of_states == 0) 
        get_number_of_states(number_of_states);
    get_max_iterations(em_max_iterations);
    get_log_likelihood_change_limit(em_log_likelihood_change_limit);
    get_parameters_change_limit(em_parameters_change_limit);
    get_map_flag(MAP_flag);

    printf("Running Learning\n");
    int exit_code = learning_discrete_BayNet(*pairwise_interactions_filepath, *logical_factorgraph_filepath, *observed_data_filepath, *estimated_parameters_filepath, *number_of_states, *em_max_iterations, *em_log_likelihood_change_limit, *em_parameters_change_limit, *MAP_flag, *logging);
    if (exit_code != 0) {
        char * strerr = strerror_pgmlab(exit_code);
        printf("Learning failed (error code: %d): %s\n", exit_code, *strerr);
        return 0;
    } 
    else {
        printf("\tEstimated Parameters have been written to the following file: %s\n", *estimated_parameters_filepath);
        printf("\tLearning completed\n\n");
    }

    return 0;
}

int interactive_inference(char** pairwise_interactions_filepath, char **factorgraph_filepath, char ** observed_data_filepath, char** posterior_probabilities_filepath, int *number_of_states) {
    printf("\nGathering information required to perform inference\n");
    if (access(*factorgraph_filepath, R_OK) != 0) 
        get_readable_factorgraph_filepath(factorgraph_filepath);
    if (access(*pairwise_interactions_filepath, R_OK) != 0)
        get_readable_pairwise_interaction_filepath(pairwise_interactions_filepath);
    if (access(*observed_data_filepath, R_OK) != 0)
        get_observed_data_filepath(observed_data_filepath);
    get_writeable_posterior_probabilities_filepath(posterior_probabilities_filepath);
    if (*number_of_states == 0) 
        get_number_of_states(number_of_states);
  
    printf("Running Inference\n");
    int exit_code = doLBPinference(*pairwise_interactions_filepath, *factorgraph_filepath, *observed_data_filepath, *posterior_probabilities_filepath, *number_of_states);
    if (exit_code != 0) {
         char * strerr = strerror_pgmlab(exit_code);
         printf("Inference failed with (error code: %d): %s\n", exit_code, *strerr);
         return exit_code;
    }
    else {
         printf("\tPosterior probabilities have been written to the following file: %s\n", *posterior_probabilities_filepath);
         printf("\tInference completed\n");
    }

    return 0;
}

int interactive_command() {
    char *input; 
    char *pairwise_interactions_filepath, *logical_factorgraph_filepath, *learning_observed_data_filepath, *inference_observed_data_filepath, *estimated_parameters_filepath, *posterior_probabilities_filepath;

    double result = 0;
    int number_of_states = 0;
    int logging = 0;
    int em_max_iterations = 0;
    double em_log_likelihood_change_limit = 0;
    double em_parameters_change_limit = 0;
    int MAP_flag = 0;

    input = readline("\nWould you like to generate a factorgraph from pairwise interactions [Y/n] ");
    if (is_yes(input) == 1)
    {
        interactive_pairwise_to_factorgraph(&pairwise_interactions_filepath, &logical_factorgraph_filepath, &number_of_states);
    } 

    input = readline("Would you like to perform learning [Y/n] ");
    if (is_yes(input) == 1)
    {
        interactive_learning(&pairwise_interactions_filepath, &logical_factorgraph_filepath, &learning_observed_data_filepath, &estimated_parameters_filepath, &number_of_states, &em_max_iterations, &em_log_likelihood_change_limit, &em_parameters_change_limit, &MAP_flag, &logging);  
    } 

    input = readline("Would you like to perform inference [Y/n] ");
    if (is_yes(input) == 1)
    {
        if ((strlen(estimated_parameters_filepath) != 0) || (strlen(logical_factorgraph_filepath) !=0 )) {
            input =  is_yes( readline("\nSelect yes if you would like to use a learnt factorgraph (estimated parameters from learning) file vs a logical factorgraph file [Y/n] ")) ;
        } 

        if (input)         
        {
            interactive_inference(&pairwise_interactions_filepath, &estimated_parameters_filepath, &inference_observed_data_filepath, &posterior_probabilities_filepath, &number_of_states);  
        } 
        else { 
            interactive_inference(&pairwise_interactions_filepath, &logical_factorgraph_filepath, &inference_observed_data_filepath, &posterior_probabilities_filepath, &number_of_states);  
        }
    } 

    printf("\nAnalysis Complete\n");
    return 0;
}

int interactive_commands() {
    char *inpt;

    int i = 0;

    while ( i < 10 )
    {
        inpt = readline("Enter text: ");
        add_history(inpt);
        printf("%s", inpt);
        printf("\n");
        ++i;
    }

}

int main(int argc, char *argv[]) {
    struct arg_lit *i, *l, *g, *interactive, *logging_on, *map_off, *inference_use_logical_factorgraph;
    struct arg_lit *help, *version, *verbose;
    struct arg_end *end;
    struct arg_str *data_dir;
    struct arg_str *network_dir_name;
    struct arg_int *em_max_iterations, *number_of_states;
    struct arg_file *pairwise_interaction_file, *logical_factorgraph_file, *estimated_parameters_file, *learning_observed_data_file, *inference_observed_data_file, *inference_factorgraph_file, *posterior_probability_file;
    struct arg_dbl *em_log_likelihood_change_limit, *em_parameters_change_limit; 

    void *argtable[] = {
        g = arg_lit0("g", "generate-factorgraph", "Generate factor graph from reaction logic [pairwise-interaction-file, logical-factorgraph-file]"),
        l = arg_lit0("l", "learning", "Run learning using training dataset [pairwise-interaction-file, logical-factorgraph-file, learning-observed-data-file, estimated-parameters-file]"),
        i = arg_lit0("i", "inference", "Run inference given the states of visible sets [pairwise-interaction-file, inference-factorgaph-file, inference-observed-data-file, posterior-probability-file]"),

        interactive = arg_lit0(NULL, "interactive", "Interactive mode"),

        data_dir = arg_str0(NULL, "data-dir", NULL, "Path to folder containing data in specified folder structure and naming conventions"),
        network_dir_name = arg_str0(NULL, "network-dir-name", NULL, "This flag allows you to specify a specific sub directory in the data-dir folder"),

        pairwise_interaction_file    = arg_file0(NULL, "pairwise-interaction-file", NULL, "File path to pairwise interaction file"),
        logical_factorgraph_file     = arg_file0(NULL, "logical-factorgraph-file", NULL, "File path to factorgraph file create from pairwise interaction file"),
        estimated_parameters_file    = arg_file0(NULL, "estimated-parameters-file", NULL, "File path to factorgraph file generated by learning"),
        learning_observed_data_file  = arg_file0(NULL, "learning-observed-data-file", NULL, "File path to oberserved data used during learning"),
        inference_observed_data_file = arg_file0(NULL, "inference-observed-data-file", NULL, "File path to oberserved data used during inference"),
        inference_factorgraph_file   = arg_file0(NULL, "inference-factorgraph-file", NULL, "File path to factorgraph used during inference"),
        posterior_probability_file   = arg_file0(NULL, "posterior-probability-file", NULL, "File path to where you would like the posterior probabiliies to be written"),

        number_of_states = arg_int0(NULL, "number-of-states", NULL, "Number of states for each node (default is 2)"),
        em_max_iterations = arg_int0(NULL, "em-max-iterations", NULL , "Maximum number of iterations in the EM algorithm - used in learning (default is 4000)"),
        em_log_likelihood_change_limit = arg_dbl0(NULL, "log-likelihood-change-limit", NULL, "Stopping criteria: change in the ML - used in learning (default 1e-5)"),
        em_parameters_change_limit = arg_dbl0(NULL, "parameters-change-limit", NULL, "Stopping criteria: change in the parameters - used in learning (default 1e-3)"),
        logging_on = arg_lit0(NULL, "logging-on", "Set this flag if you would like the learning step to print out the status into a log file (this file will have the same name as the estimate parameters file with .log appended to the end)"), 
        map_off = arg_lit0(NULL, "maximum-a-posteriori-estimation", "Use this flag to set the MAP flag to 0 (default 1)"),
        verbose = arg_lit0("v","verbose", "will provide verbose output when using data dir"),
        help = arg_lit0(NULL,"help", "Display help and exit"),
        version = arg_lit0(NULL,"version", "Display version information and exit"),
        end = arg_end(20)
    };
 
    const char *program_name = "pgmlab";
    const char *program_version = "1.0.0";

    int exitcode = 0;
    int nerrors;

    /* set any command line default values prior to parsing */
    em_max_iterations->ival[0] = 4000;
    em_parameters_change_limit->dval[0] = 1e-3;
    em_log_likelihood_change_limit->dval[0] = 1e-5;
    number_of_states->ival[0] = 2; 

    /* verify the argtable[] entries were allocated sucessfully */
    if (arg_nullcheck(argtable) != 0) {
        /* NULL entries were detected, some allocations must have failed */
        printf("%s: insufficient memory\n", program_name);
        exitcode = 1;
        goto exit;
    }

    /* Parse the command line as defined by argtable[] */
    nerrors = arg_parse(argc,argv,argtable);

    /* special case: '--help' takes precedence over error reporting */
    if ( (help->count > 0) || (argc == 1) ) {
        printf("Usage: %s", program_name);
        arg_print_syntax(stdout,argtable,"\n");
        printf("Perform inference and learning on probabilistic networks.\n");
        arg_print_glossary(stdout,argtable," %-25s %s\n");
        printf("Report bugs to <adam.j.wright82@gmail.com>.\n");
        exitcode = 0;
        goto exit;
    }

    /* special case: '--version' takes precedence error reporting */
    if (version->count > 0) {
        printf("'%s' for performing inference and learning on probability networks.\nVersion %s\n", program_name, program_version);
        printf("January 2015, Hossein Radfar and Adam Wright\n");  
        exitcode = 0;
        goto exit;
    }

    /* If the parser returned any errors then display them and exit */
    if (nerrors > 0) {
        /* Display the error details contained in the arg_end struct.*/
        arg_print_errors(stdout, end, program_name);
        printf("Try '%s --help' for more information.\n",program_name);
        exitcode = 1;
        goto exit;
    }

    int logging = logging_on->count > 0 ? 1 : 0;
    int map = map_off->count > 1 ? 0: 1;

    if (network_dir_name->count >= 1) {
        if (data_dir->count == 0) {
            printf("Error: When specifying the network_dir_name you must specify the data_dir as well");
            goto exit;
        }

        printf("Starting analysis on specified network folder in data-dir\n");
        int data_dir_idx, network_dir_name_idx;
        for(data_dir_idx = 0; data_dir_idx < data_dir->count; data_dir_idx++) {
            printf("\tAnalyzing Directory: %s\n", data_dir->sval[data_dir_idx]);
            for(network_dir_name_idx = 0; network_dir_name_idx < network_dir_name->count; network_dir_name_idx++) {
                printf("\t\tAnalyzing Network: %s\n", network_dir_name->sval[network_dir_name_idx]);
                exitcode = analyze_network_directory(network_dir_name->sval[network_dir_name_idx],
                                                     data_dir->sval[data_dir_idx], 
                                                     em_max_iterations->ival[0],
                                                     em_log_likelihood_change_limit->dval[0], 
                                                     em_parameters_change_limit->dval[0], 
                                                     number_of_states->ival[0],
                                                     (verbose->count >= 1)? 1: 0,
                                                     map);
            }
        }
        printf("Analysis Complete\n");
        goto exit;
    }

    if (data_dir->count >= 1) {
        printf("Starting analysis on sub directories in datadir\n");
        int data_dir_idx;
        for(data_dir_idx = 0; data_dir_idx < data_dir->count; data_dir_idx++) {
            printf("\tAnalyzing Directory: %s\n", data_dir->sval[data_dir_idx]);
            exitcode = analyze_directory( data_dir->sval[data_dir_idx], 
                                          em_max_iterations->ival[0],
                                          em_log_likelihood_change_limit->dval[0], 
                                          em_parameters_change_limit->dval[0], 
                                          number_of_states->ival[0],
                                          (verbose->count >= 1)? 1: 0,
                                          map);
            printf("Analysis Complete\n");
        }
        goto exit;
    }

    if (interactive->count > 0) {
        printf("Starting Interactive Mode\n>>");
        interactive_command();
        goto exit;
    }

    printf("inference obs %s\n", posterior_probability_file->filename[0]);
    /* Command line parsing is complete, do the main processing */
    exitcode = non_interactive_command( em_max_iterations->ival[0],
                                        em_log_likelihood_change_limit->dval[0], 
                                        em_parameters_change_limit->dval[0], 
                                        number_of_states->ival[0], 
                                        (pairwise_interaction_file->count == 1)?    pairwise_interaction_file->filename[0]    : "", 
                                        (logical_factorgraph_file->count == 1)?     logical_factorgraph_file->filename[0]     : "",
                                        (estimated_parameters_file->count == 1)?    estimated_parameters_file->filename[0]    : "",
                                        (learning_observed_data_file->count == 1)?  learning_observed_data_file->filename[0]  : "",
                                        (inference_factorgraph_file->count == 1)?   inference_factorgraph_file->filename[0]   : "",
                                        (inference_observed_data_file->count == 1)? inference_observed_data_file->filename[0] : "",
                                        (posterior_probability_file->count == 1)?   posterior_probability_file->filename[0]   : "",
                                        g->count, l->count, i->count, logging, map);
exit:
    /* deallocate each non-null entry in argtable[] */
    arg_freetable(argtable,sizeof(argtable)/sizeof(argtable[0]));  

    return exitcode;
}
