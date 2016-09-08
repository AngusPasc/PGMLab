package PGMLab;

use strict;
use warnings;
no warnings 'recursion';

use autodie;
use feature qw(say);

use POSIX;

use Data::Dumper;

use base "Exporter";
use vars qw(@EXPORT_OK);
@EXPORT_OK = qw(print_factorgraph generate_factorgraph_from_pi_file flip_pi_logic find_cycles print_cycles add_pseudo_nodes_to_interactions is_pi_a_tree create_pi_file create_obs_file get_nodes_in_pi_file get_interactions_in_pi_file get_siblings_in_pi_file);

sub print_factorgraph {
    my ($factorgraph, $filepath) = @_; 

    open(my $fh, ">", $filepath);

    say scalar(@{$factorgraph});

    foreach my $factor (@{$factorgraph}) {
        say "";
        my @parents = @{$factor->{parents}};
        my $variable_nodes = [$factor->{child}, @parents];
        my $num_variable_nodes = scalar @$variable_nodes;
        say $num_variable_nodes;
        my $variable_node_string = join " ", @$variable_nodes;
        say $variable_node_string;
    }       

    close($fh);
}

sub generate_factorgraph {
    my ($child_to_parent_pi, $number_of_states, $verbose) = @_;

    my @factorgraph;
    foreach my $child (keys %{$child_to_parent_pi}) {
        my $and_or = $child_to_parent_pi->{$child}{and_or};
        my @parents = keys %{$child_to_parent_pi->{$child}{parents}};
        
        my $factor = {"child" => $child,
                      "parents" => \@parents,
                      "cpt" => generate_cpt_table(\@parents, $verbose)};
        push @factorgraph, $factor;
    }

    return \@factorgraph;
}

sub generate_cpt_table {
  my ($parents, $verbose) = @_;
  return 1;
}

sub generate_factorgraph_from_pi_file {
    my ($pi_file_path, $number_of_states, $verbose) = @_;

    open(my $fh_pi, "<", $pi_file_path);

    <$fh_pi>;<$fh_pi>; ##remove fist two rows

    my %child_to_parent_pi;
    my ($parent, $child, $and_or, $interaction_type);
    while (my $interaction = <$fh_pi>) {
        chomp $interaction;
        ($parent, $child, $and_or, $interaction_type) = split /\t/, $interaction;
        $child_to_parent_pi{$child}{and_or} = $and_or;
        $child_to_parent_pi{$child}{parents}{$parent} = $interaction_type;
    }

    close($fh_pi);

    return generate_factorgraph(\%child_to_parent_pi, $number_of_states, $verbose);
}




sub flip_pi_logic {
    my ($pi_interactions, $verbose) = @_;

    my $negative_interaction_children = find_negative_interaction_children($pi_interactions, $verbose);

    foreach my $from (keys %$pi_interactions) {
        foreach my $to (keys %{$pi_interactions->{$from}}) {
            if (grep {$to eq $_} @$negative_interaction_children) {
                $pi_interactions->{$from}{$to}[1] = 1;
                if ($verbose) {
                   say "switching interaction to 1 for interaction: $from > $to";
                }
            }
        }
    }
}


sub find_negative_interaction_children {
    my ($pi_interactions, $verbose) = @_;

    my (%has_negative_interactions, $interaction_details);
    foreach my $from (keys %$pi_interactions) {
        foreach my $to (keys %{$pi_interactions->{$from}}) {
             $interaction_details = $pi_interactions->{$from}{$to};
             if($interaction_details->[0] == -1) {
                 $has_negative_interactions{$to} =1;
             }
        }
    }

    my @children = keys %has_negative_interactions;

    return \@children;
}

## returning 1 if is a tree
sub is_pi_a_tree {
    my($pi_interactions) = @_;

    my $network = create_network($pi_interactions);

    foreach my $node (keys %{$network}) {
        next if ($network->{$node}{visited});

        my $start_node = $node;
        return 0 if(visit_node($network, $start_node, $node));
    }

    return 1;
}

sub find_cycles {
    my ($pi_interactions) = @_;

    my $network = create_network($pi_interactions);

    my @cycles = ();
    foreach my $node (sort keys %$network) {
        next if ($network->{$node}{started_with});
        $network->{$node}{started_with} = $node;
        my $start_node = $node;
        find_new_cycles($network, $start_node, $node, \@cycles, []);
    }

    return \@cycles;
}

sub find_new_cycles {
    my ($network, $start_node, $node, $cycles, $path) = @_;
    
    $network->{$node}{visited} = $start_node;

    push @$path, $node;
    foreach my $child (sort @{$network->{$node}{children}}) {
        next unless(eval { exists $network->{$child} });
        if (($network->{$child}{visited} eq $start_node) || $network->{$child}{started_with}) {
            if ($network->{$child}{started_with} eq $start_node) {
               my @new_path = @$path;
               push @{$cycles}, \@new_path;
            }
            next;
        }

        find_new_cycles($network, $start_node, $child, $cycles, $path);
        pop @$path;
    }
}

sub visit_node {
    my ($network, $start_node, $node) = @_;

    $network->{$node}{visited} = $start_node;

    foreach my $child (@{$network->{$node}{children}}) {
        if (($network->{$child}) && ($network->{$child}{visited} eq $start_node)) {
               return 1;
        }
        if (not $network->{$child}{visited}) {
            if (visit_node($network, $start_node, $child)) {
              return 1;
            }
        }
    }

    return 0;   
}


sub print_cycles {
    my ($cycles) = @_;

    say "Cycles:";
    my $path_str;
    foreach my $path (@$cycles) {
        $path_str = join ' -> ', @$path;
        say $path_str;
    }
}

####

sub add_pseudo_nodes_to_interactions {
    my ($interactions, $max_number_of_parents) = @_;
    
    my ($num_groups, $num_parents, $nodes_per_group, $node_index, $group_index);
    foreach my $child (keys %{$interactions}) {
        my @parents = keys %{$interactions->{$child}};
        $num_parents = scalar @parents;
        if ($num_parents >= 10) {
            $num_groups =  ceil($num_parents/$max_number_of_parents);
            $nodes_per_group = ceil($num_parents/$num_groups);
    
            $group_index = 1;
            $node_index = 1;
            foreach my $parent (@parents) {
                  if ($node_index > $nodes_per_group) {
                       $node_index = 1;
                       $group_index++;
                  }
                  my @node_data = @{$interactions->{$child}{$parent}};
                  $interactions->{"$child\_PSEUDONODE\_$group_index"}{$parent} = \@node_data;
                  $node_index++; 
            } 
            for(my $i = 1; $i < $num_groups; $i++) {
                $interactions->{$child}{"$child\_PSEUDONODE\_$i"} = [1,$interactions->{$child}{$parents[0]}[1]];
            }
        }
    }
}


sub create_network {
    my ($pi_interactions) = @_;

    my %network;
    foreach my $node (keys %{$pi_interactions}) {
        if (defined $pi_interactions->{$node}) {
             my @keys = keys %{$pi_interactions->{$node}};
             my $children = \@keys;
             if ($children) { #can't be in cycle if does not have children
                 $network{$node} = {"children"     => $children,
                                    "started_with" => 0,
                                    "visited"      => 0};
             }
        }
    }

    return \%network;
}
   
sub create_pi_file {
    my ($pi_filepath, $interactions) = @_;

    my $number_of_interactions = get_number_of_interactions($interactions);

    open(my $fh, ">", $pi_filepath);

    print $fh "$number_of_interactions\n\n";
    foreach my $parent (keys %{$interactions}) {
        foreach my $child (keys %{$interactions->{$parent}}) {
            my @values = @{$interactions->{$parent}{$child}};
            print $fh "$parent\t$child\t".$values[0]."\t".$values[1]."\n";
        }
    }
    
    close($fh);
}

sub get_number_of_interactions {
    my ($interactions) = @_;

    my $number_of_interactions = 0;
    foreach my $child (keys %{$interactions}) {
        $number_of_interactions += scalar( keys %{$interactions->{$child}});
    }

    return $number_of_interactions;
}


sub create_obs_file {
    my ($obs_filepath, $sample_gene_states, $sample_list, $verbose) = @_;

    $sample_list //= [keys %{$sample_gene_states}];


    say "Writing observation file to: $obs_filepath";
    open(my $obs_fh, ">", $obs_filepath);

    say $obs_fh scalar (keys %{$sample_gene_states});
    foreach my $sample_name (@{$sample_list}) {
         my $gene_values = $sample_gene_states->{$sample_name};
         my $gene_count = scalar(keys %$gene_values);
    
         say $obs_fh $gene_count;
         foreach my $gene (keys %$gene_values) {
             say $obs_fh $gene."\t".$gene_values->{$gene};
         }
    }

    close($obs_fh);
}


sub get_interactions_in_pi_file {
    my ($pi_file_path) = @_;

    open(my $fh_pi, "<", $pi_file_path);

    <$fh_pi>;<$fh_pi>; ##remove fist two rows

    my %pi_interactions;
    my ($from, $to, $column_3, $column_4);
    while (my $interaction = <$fh_pi>) {
        chomp $interaction;
        ($from, $to, $column_3, $column_4) = split /\t/, $interaction;
        $pi_interactions{$from}{$to} = [$column_3, $column_4];
    }

    close($fh_pi);

    return \%pi_interactions;
}

sub get_nodes_in_pi_file {
    my ($pi_file_path) = @_;

    open(my $fh_pi, "<", $pi_file_path);

    <$fh_pi>;<$fh_pi>; ##remove fist two rows

    my %pi_nodes;
    my ($from, $to, $column_3, $column_4);
    while (my $interaction = <$fh_pi>) {
        chomp $interaction;
        ($from, $to, $column_3, $column_4) = split /\t/, $interaction;
        $pi_nodes{$from} = 1;
        $pi_nodes{$to} = 1;

    }

    close($fh_pi);

    return \%pi_nodes;
}

sub get_siblings_in_pi_file {
    my ($pi_filepath) = @_;

    open(my $fh, "<", $pi_filepath);

    #skip header
    <$fh>;<$fh>;

    my %siblings;
    while (my $line = <$fh>) {
        chomp $line;
        my ($from, $to, $part_three, $part_four) = split /\t/, $line;
        $siblings{$to}{siblings}{$from} = 1;
        $siblings{$from}{siblings}{$to} = 1;
    }

    close $fh;

    return \%siblings;
}

1;
