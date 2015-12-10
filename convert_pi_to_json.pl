#!/usr/bin/perl

use strict;
use warnings;

use autodie;

use JSON;
use Data::Dumper;


use feature qw{say};

my $pi_file = $ARGV[0];

open (my $fh, "<", $pi_file);

my %unique_nodes;
my ( $source, $target, $value, $flag);

<$fh>;<$fh>; # skip first two lines of file
while ( <$fh> ) {
   chomp();
   ($source, $target, $value, $flag) = split "\t";
   if (($source =~ /_AND$/) || ($source =~ /_OR$/)) {
        $unique_nodes{$source} = "diamond";
   }
   else {
        $unique_nodes{$source} = "circle";
   }
   if (($target =~ /_AND$/) || ($target =~ /_OR$/)) {
        $unique_nodes{$target} = "diamond";
   }
   else {
        $unique_nodes{$target} = "circle";
   }
}

close($fh);

my @nodes = map { { "name" => $_,  "type" => $unique_nodes{$_} }  } keys %unique_nodes;
my $nodes_length = @nodes;

open ($fh, "<", $pi_file);

my (@links, %link);
<$fh>;<$fh>;
while ( <$fh> ) {
   chomp();
   ($source, $target, $value, $flag) = split "\t";
   push @links, {  "value"  => $value,
                   "source" => get_index_of_node($source),
                   "target" => get_index_of_node($target),
                   "logic"  => $flag
                 };
}

close($fh);

my $graph = { "nodes" => \@nodes, "links" => \@links };

say "var graph = ".JSON->new->utf8->pretty->encode($graph).';';

sub get_index_of_node {
   my ($node_id) = @_;

   my %node = ();
   for (my $i = 0; $i <= $nodes_length; $i++) {
      %node = %{$nodes[$i]};
      return $i if ( $node{"name"} eq $node_id);
   }
}


